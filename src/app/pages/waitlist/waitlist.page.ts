import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonContent,
  ToastController,
} from '@ionic/angular';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { Router } from '@angular/router';
import { Confirm, Waitlist } from '@app/services';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { ClientsNavigationComponent } from '../clients/components/clients-navigation/clients-navigation.component';
import { WaitlistCardComponent } from './components/waitlist-card/waitlist-card.component';

@Component({
  selector: 'app-waitlist',
  templateUrl: './waitlist.page.html',
  styleUrls: ['./waitlist.page.scss'],
  imports: [
    CommonModule,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    ConfirmVolverComponent,
    IonContent,
    SpinnerLogoComponent,
    ClientsNavigationComponent,
    WaitlistCardComponent,
  ],
})
export class WaitlistPage {
  private _router = inject(Router);
  private _waitlistService = inject(Waitlist);
  private _confirm = inject(Confirm);
  private _toastController = inject(ToastController);

  private _unsubscribe: (() => void) | null = null;

  users = signal<any[]>([]);
  filtroSeleccionado = signal<number | 'todos'>('todos');
  cargando = signal(true);
  indiceActual = signal(0);

  private touchStartX = 0;
  private touchEndX = 0;

  readonly filtros: Array<number | 'todos'> = [
    'todos',
    1,
    2,
    3,
    4,
    5,
  ];

  usuariosFiltrados = computed((): any[] => {
    const filtro = this.filtroSeleccionado();

    if (filtro === 'todos') {
      return this.users();
    }

    if (filtro === 5) {
      return this.users().filter(
        (entry) =>
          Number(entry.comensales ?? 1) >= 5
      );
    }

    return this.users().filter(
      (entry) =>
        Number(entry.comensales ?? 1) === filtro
    );
  });

  // posición que se muestra en el contador
  posicionVisible = computed(() =>
    this.usuariosFiltrados().length === 0
      ? 0
      : Math.min(this.indiceActual(), this.usuariosFiltrados().length - 1) + 1
  );

  seleccionarFiltro(
    filtro: number | 'todos'
  ): void {
    this.filtroSeleccionado.set(filtro);
    this.indiceActual.set(0);
  }

  // clase de cada tarjeta según su lugar en el carrusel
  obtenerClaseCarta(
    indice: number
  ): 'activa' | 'anterior' | 'siguiente' | 'oculta' {
    const total = this.usuariosFiltrados().length;
    const actual = Math.min(this.indiceActual(), total - 1);

    if (indice === actual) {
      return 'activa';
    }

    if (indice === (actual - 1 + total) % total) {
      return 'anterior';
    }

    if (indice === (actual + 1) % total) {
      return 'siguiente';
    }

    return 'oculta';
  }

  irAnterior(): void {
    const total = this.usuariosFiltrados().length;

    if (total <= 1) {
      return;
    }

    this.indiceActual.set((this.indiceActual() - 1 + total) % total);
  }

  irSiguiente(): void {
    const total = this.usuariosFiltrados().length;

    if (total <= 1) {
      return;
    }

    this.indiceActual.set((this.indiceActual() + 1) % total);
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0]?.screenX ?? 0;
    this.touchEndX = this.touchStartX;
  }

  onTouchMove(event: TouchEvent): void {
    this.touchEndX = event.changedTouches[0]?.screenX ?? this.touchEndX;
  }

  // deslizar a un lado o al otro cambia de cliente
  onTouchEnd(event: TouchEvent): void {
    this.touchEndX = event.changedTouches[0]?.screenX ?? this.touchEndX;

    const distancia = this.touchEndX - this.touchStartX;

    if (Math.abs(distancia) < 50) {
      return;
    }

    if (distancia > 0) {
      this.irAnterior();
    } else {
      this.irSiguiente();
    }
  }

  asignarMesa(entry: any): void {
    void this._router.navigate(['/admin/waitlist', entry.id]);
  }

  async eliminar(entry: any): Promise<void> {
    const nombre =
      `${entry.usuarios?.nombre ?? ''} ${entry.usuarios?.apellido ?? ''}`
        .trim();

    const confirmado =
      await this._confirm.preguntar({
        titulo: '¿Eliminar de la lista?',
        mensaje:
          `${nombre || 'Este cliente'} dejará de esperar una mesa.`,
        textoConfirmar: 'Eliminar',
        colorConfirmar: 'danger',
        icono: 'trash-outline',
      });

    if (!confirmado) {
      return;
    }

    try {
      console.log(`CAMBIAR EL ESTADO A CANCELADO AL USUARIO QUE TIENE EL ID ${entry.usuario_id} | ID LISTA ESPERA: ${entry.id}`)
      console.log(entry)

      await this._waitlistService.removeUserFromWaitlist(
        entry.usuario_id,
        entry.id
      );

      this.users.update((users) =>
        users.filter(
          (user) => user.id !== entry.id
        )
      );
      this._ajustarIndice();

      const toast =
        await this._toastController.create({
          message:
            'Cliente eliminado de la lista.',
          duration: 2500,
          position: 'top',
          color: 'success',
        });

      await toast.present();
    } catch (error) {
      console.error(
        'Error eliminando cliente:',
        error
      );

      const toast =
        await this._toastController.create({
          message:
            'No pudimos eliminar al cliente. Intentá nuevamente.',
          duration: 3000,
          position: 'top',
          color: 'danger',
        });

      await toast.present();
    }
  }

  async ngOnInit(): Promise<void> {
    await this._loadList();

    this._unsubscribe =
      this._waitlistService.getListChange(
        () => {
          void this._loadList();
        }
      );
  }

  private async _loadList(): Promise<void> {
    try {
      const users =
        await this._waitlistService.getList();

      this.users.set(users);
      this._ajustarIndice();
    } catch (error) {
      console.error(
        'Error cargando lista de espera:',
        error
      );

      const toast =
        await this._toastController.create({
          message:
            'No pudimos cargar la lista de espera.',
          duration: 3000,
          position: 'top',
          color: 'danger',
        });

      await toast.present();
    } finally {
      this.cargando.set(false);
    }
  }

  // si la lista se achica, la tarjeta actual no queda fuera de rango
  private _ajustarIndice(): void {
    const total = this.usuariosFiltrados().length;

    if (this.indiceActual() >= total) {
      this.indiceActual.set(Math.max(total - 1, 0));
    }
  }

  volver(): void {
    void this._router.navigate([
      '/admin',
    ]);
  }

  ngOnDestroy(): void {
    this._unsubscribe?.();
  }
}