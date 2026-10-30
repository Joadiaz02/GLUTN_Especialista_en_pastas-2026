import {
  AfterViewInit,
  Component,
  ChangeDetectorRef,
  ElementRef,
  HostListener,
  OnDestroy,
  inject,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
} from '@ionic/angular';

import { Auth } from '../../services/auth/auth';
import { ADMIN_MODULES } from './data/admin.modules';
import { AdminModule } from '@app/models/admin.model';
import { AdminModuleCardComponent } from '@app/components/admin-module-card/admin-module-card.component';

import { ConfirmDialogComponent } from '../../components/ui/confirm-cartel/confirm-cartel.component';
import { addIcons } from 'ionicons';
import { logOutOutline } from 'ionicons/icons';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { HeaderComponent } from '@app/components/ui';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonContent,
    AdminModuleCardComponent,
    RouterLink,
    ConfirmDialogComponent,
    ConfirmVolverComponent,
    HeaderComponent
],
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
})
export class AdminPage implements AfterViewInit, OnDestroy {
  private auth = inject(Auth);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  private resizeObserver?: ResizeObserver;
  private layoutFrame = 0;

  modulosVisibles: AdminModule[] = [];

  constructor() {
    addIcons({
      'log-out-outline': logOutOutline,
    });
  }

  ngAfterViewInit(): void {
    // Recalcula si cambia el tamaño del área (rotación, barra del sistema,
    // tamaño de fuente, etc.).
    const layout = this.host.nativeElement.querySelector('.admin-layout');
    if (layout && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.programarAjuste());
      this.resizeObserver.observe(layout);
    }

    // Al cargar la fuente cambia el ancho del texto y, con eso, el alto de las tarjetas.
    void document.fonts?.ready.then(() => this.programarAjuste());
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    cancelAnimationFrame(this.layoutFrame);
  }

  ionViewWillEnter(): void {
    void this.cargarModulos();
  }

  ionViewDidEnter(): void {
    this.programarAjuste();
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange')
  onResize(): void {
    this.programarAjuste();
  }

private async cargarModulos(): Promise<void> {
  // Evitar mostrar módulos del usuario anterior
  this.modulosVisibles = [];

  const usuario = await this.auth.obtenerUsuarioActual();

  if (!usuario) {
    await this.router.navigate(['/login'], {
      replaceUrl: true,
    });
    return;
  }

  const perfil = this.auth.obtenerPerfil(usuario);

  if (!perfil) {
    await this.router.navigate(['/login'], {
      replaceUrl: true,
    });
    return;
  }

  this.modulosVisibles = ADMIN_MODULES.filter(
    modulo => modulo.roles.includes(perfil)
  );

  this.cdr.detectChanges();
  this.programarAjuste();
}

getLengthModulosVisibles() {
  return this.modulosVisibles.length == 2 || this.modulosVisibles.length == 3 ? true : false
}

  private programarAjuste(): void {
    cancelAnimationFrame(this.layoutFrame);
    this.layoutFrame = requestAnimationFrame(() => this.ajustarScroll());
  }

  /**
   * Hace que el área de scroll muestre siempre un número entero de filas y
   * que esas filas rellenen justo el alto disponible:
   *  - arriba de todo, la tarjeta de abajo nunca queda cortada;
   *  - abajo de todo, la de arriba nunca queda cortada;
   *  - no sobra ningún hueco vacío debajo de la última fila visible.
   * Si en el diseño vertical las tarjetas quedarían con demasiado aire
   * adentro (celulares altos), usa el diseño compacto (ícono | texto | flecha).
   */
  private ajustarScroll(): void {
    const root = this.host.nativeElement;
    const layout = root.querySelector<HTMLElement>('.admin-layout');
    const header = root.querySelector<HTMLElement>('.header-section');
    const scroller = root.querySelector<HTMLElement>('.admin-scroller');
    const grid = root.querySelector<HTMLElement>('.modules-container');
    if (!layout || !header || !scroller || !grid) return;
    if (grid.children.length === 0) return;

    const vertical = this.planificar(grid, scroller, layout, header, false);
    if (!vertical) return;

    let plan = vertical;
    // Si entran todas en vertical se respeta el diseño original: no hay nada
    // que scrollear y las tarjetas ya se estiran lo justo.
    if (!vertical.entranTodas && vertical.sobraPorFila > AdminPage.AIRE_MAXIMO) {
      const compacto = this.planificar(grid, scroller, layout, header, true);
      if (compacto && compacto.sobraPorFila < vertical.sobraPorFila) {
        plan = compacto;
      }
    }

    // Deja aplicado el diseño elegido.
    if (plan.compacto !== grid.classList.contains('modules-container--compact')) {
      this.planificar(grid, scroller, layout, header, plan.compacto);
    }
    this.aplicar(plan, grid, scroller);
  }

  /** Aire interno máximo tolerado por tarjeta (px) antes de pasar a compacto. */
  private static readonly AIRE_MAXIMO = 24;

  /** Mide con el diseño pedido y calcula alto de fila, separación y alto del área. */
  private planificar(
    grid: HTMLElement,
    scroller: HTMLElement,
    layout: HTMLElement,
    header: HTMLElement,
    compacto: boolean,
  ): {
    compacto: boolean;
    entranTodas: boolean;
    rowHeight: number;
    rowGap: number;
    scrollerHeight: number | null;
    sobraPorFila: number;
  } | null {
    // Medir con el estado "natural": todas las filas del alto de la más alta.
    grid.classList.toggle('modules-container--compact', compacto);
    grid.style.removeProperty('--admin-row-h');
    grid.style.removeProperty('--admin-row-gap');
    scroller.style.height = '';

    const cards = Array.from(grid.children) as HTMLElement[];
    const gridStyle = getComputedStyle(grid);
    const gap = parseFloat(gridStyle.rowGap) || 0;
    const columns = gridStyle.gridTemplateColumns.split(' ').filter(Boolean).length || 1;
    const natural = Math.max(...cards.map((card) => card.offsetHeight));
    if (natural <= 0) return null; // todavía sin medidas (pantalla no visible)

    const headerStyle = getComputedStyle(header);
    const headerBlock =
      header.offsetHeight +
      (parseFloat(headerStyle.marginTop) || 0) +
      (parseFloat(headerStyle.marginBottom) || 0);
    const available = Math.floor(layout.clientHeight - headerBlock);
    if (available <= 0) return null;

    // Cuántas filas enteras entran.
    const totalRows = Math.ceil(cards.length / columns);
    const fitRows = Math.max(1, Math.floor((available + gap) / (natural + gap)));
    const rows = Math.min(fitRows, totalRows);
    const entranTodas = totalRows <= fitRows;

    // Reparto del espacio sobrante (sin huecos): la mayor parte agranda las
    // tarjetas y una parte menor separa un poco más las filas.
    const maxGapExtra = 12;
    const sobrante = available - (rows * natural + (rows - 1) * gap);
    const gapExtra =
      rows > 1 ? Math.min(maxGapExtra, Math.floor((sobrante * 0.4) / (rows - 1))) : 0;
    const rowGap = gap + Math.max(0, gapExtra);
    const fill = Math.floor((available - (rows - 1) * rowGap) / rows);
    const rowHeight = entranTodas
      ? Math.max(natural, Math.min(fill, Math.round(natural * 1.1)))
      : Math.max(natural, fill);

    return {
      compacto,
      entranTodas,
      rowHeight,
      rowGap: entranTodas ? gap : rowGap,
      // Con scroll: el área mide exactamente "rows" filas. Sin scroll: libre.
      scrollerHeight: entranTodas
        ? null
        : Math.min(available, rows * rowHeight + (rows - 1) * rowGap),
      sobraPorFila: rowHeight - natural,
    };
  }

  private aplicar(
    plan: { rowHeight: number; rowGap: number; scrollerHeight: number | null },
    grid: HTMLElement,
    scroller: HTMLElement,
  ): void {
    grid.style.setProperty('--admin-row-h', `${plan.rowHeight}px`);
    grid.style.setProperty('--admin-row-gap', `${plan.rowGap}px`);
    scroller.style.height = plan.scrollerHeight === null ? '' : `${plan.scrollerHeight}px`;
  }

  seleccionarModulo(modulo: AdminModule): void {
    console.log('Módulo seleccionado:', modulo);
  }

  volver(): void {
    console.log('qwe');
    void this.router.navigate(['/seleccion-acceso']);
  }

async cerrarSesion(): Promise<void> {
  localStorage.removeItem('token');
  localStorage.removeItem('mesa');

  try {
    await this.auth.logout();

    await this.router.navigate(['/login'], {
      replaceUrl: true,
    });
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
  }
}
}