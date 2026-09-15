import { Component, inject } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  ToastController,
} from '@ionic/angular';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth/auth';
import { ConfirmDialogComponent } from '../../components/ui/confirm-cartel/confirm-cartel.component';

@Component({
  selector: 'app-reservas',
  standalone: true,
  templateUrl: './reservas.page.html',
  styleUrls: ['./reservas.page.scss'],
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    ConfirmDialogComponent,
  ],
})
export class ReservasPage {
  private _authService = inject(Auth);
  private _toastController = inject(ToastController);
  private _router = inject(Router);

  goToNuevaReserva(): void {
    this._router.navigate(['/reservas/nueva']);
  }

  goToMisReservas(): void {
    this._router.navigate(['/reservas/mis-reservas']);
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
