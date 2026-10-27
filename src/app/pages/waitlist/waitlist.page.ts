import { Component, inject, signal } from '@angular/core';
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
import { Router, RouterLink } from '@angular/router';
import { Confirm, Waitlist } from '@app/services';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';

@Component({
  selector: 'app-waitlist',
  templateUrl: './waitlist.page.html',
  styleUrls: ['./waitlist.page.scss'],
  imports: [
    CommonModule,
    RouterLink,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    ConfirmVolverComponent,
    IonContent,
    SpinnerLogoComponent,
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

  readonly filtros: Array<number | 'todos'> = [
    'todos',
    1,
    2,
    3,
    4,
    5,
  ];

  usuariosFiltrados(): any[] {
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
  }

  seleccionarFiltro(
    filtro: number | 'todos'
  ): void {
    this.filtroSeleccionado.set(filtro);
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

  volver(): void {
    void this._router.navigate([
      '/admin',
    ]);
  }

  ngOnDestroy(): void {
    this._unsubscribe?.();
  }
}