import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonSearchbar,
  ToastController,
} from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';
import { DishCardComponent } from '../dishes/components/dish-card/dish-card.component';
import { Postre, Confirm, Vibracion } from '@app/services';
import { CartaItem } from '@app/models/carta.model';
import { SkeletonCardComponent } from '../dishes/components/skeleton-card/skeleton-card.component';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { addIcons } from 'ionicons';
import { addOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';

const ITEMS_POR_PAGINA = 2;

@Component({
  selector: 'app-postres',
  templateUrl: './postres.page.html',
  styleUrls: ['./postres.page.scss'],
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonButtons,
    IonButton,
    RouterLink,
    DishCardComponent,
    IonIcon,
    IonSearchbar,
    SkeletonCardComponent,
    ConfirmVolverComponent,
  ],
})
export class PostresPage implements OnInit {
  postres = signal<CartaItem[]>([]);

  isLoading = signal<boolean>(false);

  textoBusqueda = signal('');
  indicePagina = signal(0);

  private _postreService = inject(Postre);
  private _confirm = inject(Confirm);
  private _toastController = inject(ToastController);
  private _vibracion = inject(Vibracion);
  private _router = inject(Router);

  postresFiltrados = computed(() => {
    const texto = this.textoBusqueda().trim().toLowerCase();

    return this.postres().filter(
      (p) => !texto || p.nombre.toLowerCase().includes(texto)
    );
  });

  totalPaginas = computed(() =>
    Math.max(Math.ceil(this.postresFiltrados().length / ITEMS_POR_PAGINA), 1)
  );

  postresPaginaActual = computed(() => {
    const inicio = this.indicePagina() * ITEMS_POR_PAGINA;
    return this.postresFiltrados().slice(inicio, inicio + ITEMS_POR_PAGINA);
  });

  hayAnterior = computed(() => this.indicePagina() > 0);
  haySiguiente = computed(() => this.indicePagina() < this.totalPaginas() - 1);

  constructor() {
    addIcons({ addOutline, chevronBackOutline, chevronForwardOutline });
  }

  async ngOnInit() {
    await this.cargarPostres();
  }

  private async cargarPostres(): Promise<void> {
    this.isLoading.set(true);

    const postres = await this._postreService.getList();

    this.isLoading.set(false);

    this.postres.set(postres);
  }

  onBuscar(texto: string): void {
    this.textoBusqueda.set(texto);
    this.indicePagina.set(0);
  }

  siguiente(): void {
    if (this.haySiguiente()) {
      this.indicePagina.update((i) => i + 1);
    }
  }

  anterior(): void {
    if (this.hayAnterior()) {
      this.indicePagina.update((i) => i - 1);
    }
  }

  // ============================
  // SWIPE (touch), igual que en la Carta del cliente
  // ============================

  private inicioX = 0;
  private readonly UMBRAL_SWIPE = 50;

  onTouchStart(evento: TouchEvent): void {
    this.inicioX = evento.touches[0].clientX;
  }

  onTouchEnd(evento: TouchEvent): void {
    const finX = evento.changedTouches[0].clientX;
    const delta = finX - this.inicioX;

    if (delta > this.UMBRAL_SWIPE) {
      this.anterior();
    } else if (delta < -this.UMBRAL_SWIPE) {
      this.siguiente();
    }
  }

  private async mostrarAviso(mensaje: string): Promise<void> {
    const toast = await this._toastController.create({
      message: mensaje,
      duration: 3000,
      position: 'top',
      color: 'success',
    });

    await toast.present();
  }

  private async mostrarError(): Promise<void> {
    await this._vibracion.error();

    const toast = await this._toastController.create({
      message: 'No pudimos completar la acción. Intentá nuevamente más tarde.',
      duration: 5000,
      position: 'top',
      color: 'danger',
    });

    await toast.present();
  }

  volver(): void {
    this._router.navigate(['/admin']);
  }

  editar(item: CartaItem): void {
    this._router.navigate(['/admin/postres/edit', item.id_carta]);
  }

  async destacar(item: CartaItem): Promise<void> {
    const activar = !item.sugerencia;

    const confirmado = await this._confirm.preguntar({
      titulo: activar ? '¿Marcar como destacado?' : '¿Quitar de destacados?',
      mensaje: activar
        ? `"${item.nombre}" va a aparecer en el slide de productos destacados del inicio.`
        : `"${item.nombre}" va a dejar de aparecer en el slide de productos destacados del inicio.`,
      textoConfirmar: activar ? 'Destacar' : 'Quitar',
      colorConfirmar: 'primary',
      icono: activar ? 'star' : 'star-outline',
    });

    if (!confirmado) return;

    try {
      await this._postreService.setSugerencia(item.id_carta, activar);

      await this._vibracion.confirmacion();

      await this.mostrarAviso(
        activar ? 'Postre destacado correctamente.' : 'Postre retirado de destacados.'
      );

      await this.cargarPostres();
    } catch (error) {
      await this.mostrarError();
    }
  }

  async darDeBaja(item: CartaItem): Promise<void> {
    const confirmado = await this._confirm.preguntar({
      titulo: '¿Dar de baja el postre?',
      mensaje: `"${item.nombre}" va a dejar de verse en la carta. Vas a poder reactivarlo cuando quieras.`,
      textoConfirmar: 'Dar de baja',
      colorConfirmar: 'danger',
      icono: 'trash-outline',
    });

    if (!confirmado) return;

    try {
      await this._postreService.darDeBaja(item.id_carta);

      await this._vibracion.confirmacion();

      await this.mostrarAviso('Postre dado de baja correctamente.');

      await this.cargarPostres();
    } catch (error) {
      await this.mostrarError();
    }
  }

  async reactivar(item: CartaItem): Promise<void> {
    const confirmado = await this._confirm.preguntar({
      titulo: '¿Reactivar el postre?',
      mensaje: `"${item.nombre}" va a volver a verse en la carta.`,
      textoConfirmar: 'Reactivar',
      colorConfirmar: 'primary',
      icono: 'refresh-outline',
    });

    if (!confirmado) return;

    try {
      await this._postreService.reactivar(item.id_carta);

      await this._vibracion.confirmacion();

      await this.mostrarAviso('Postre reactivado correctamente.');

      await this.cargarPostres();
    } catch (error) {
      await this.mostrarError();
    }
  }
}
