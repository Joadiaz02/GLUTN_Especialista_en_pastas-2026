import { Component, inject, signal } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonModal,
  ToastController,
} from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';
import { ConfigJuego, Juegos, LISTA_JUEGOS, REGLA_DESCUENTO } from '@app/services';
import { Auth } from '../../services/auth/auth';
import { ConfirmDialogComponent } from '../../components/ui/confirm-cartel/confirm-cartel.component';

@Component({
  selector: 'app-juegos',
  standalone: true,
  templateUrl: './juegos.page.html',
  styleUrls: ['./juegos.page.scss'],
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonModal,
    RouterLink,
    ConfirmDialogComponent,
  ],
})
export class JuegosPage {
  private _juegosService = inject(Juegos);
  private _toastController = inject(ToastController);
  private _authService = inject(Auth);
  private _router = inject(Router);

  readonly juegos: ConfigJuego[] = LISTA_JUEGOS;
  readonly reglaDescuento = REGLA_DESCUENTO;

  // El juego se conserva al cerrar la ventana para que el texto no
  // desaparezca en medio de la animación de cierre.
  juegoAyuda = signal<ConfigJuego | null>(null);
  ayudaAbierta = signal(false);

  puedeJugarPorPrimeraVez(): boolean {
    return this._juegosService.puedeJugarPorPrimeraVez();
  }

  esClienteRegistrado(): boolean {
    return this._juegosService.esClienteRegistrado();
  }

  descuentoActual(): number | null {
    return this._juegosService.descuentoActual();
  }

  abrirAyuda(juego: ConfigJuego): void {
    this.juegoAyuda.set(juego);
    this.ayudaAbierta.set(true);
  }

  cerrarAyuda(): void {
    this.ayudaAbierta.set(false);
  }

  async cerrarSesion(): Promise<void> {
    await this._authService.logout();

    localStorage.removeItem('mesa');

    const toast = await this._toastController.create({
      message: 'Sesión cerrada correctamente.',
      duration: 3000,
      position: 'top',
      color: 'success',
    });
    await toast.present();

    void this._router.navigate(['/login']);
  }
}
