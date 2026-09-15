import { Component, inject } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  ToastController,
} from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';
import { Juegos } from '@app/services';
import { Auth } from '../../services/auth/auth';
import { ConfirmDialogComponent } from '../../components/ui/confirm-cartel/confirm-cartel.component';

interface JuegoDisponible {
  nombre: string;
  porcentaje: number;
  ruta: string;
  disponible: boolean;
}

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
    RouterLink,
    ConfirmDialogComponent,
  ],
})
export class JuegosPage {
  private _juegosService = inject(Juegos);
  private _toastController = inject(ToastController);
  private _authService = inject(Auth);
  private _router = inject(Router);

  juegos: JuegoDisponible[] = [
    { nombre: 'Ruleta', porcentaje: 20, ruta: '/juegos/ruleta', disponible: true },
    { nombre: 'Ta-Te-Ti', porcentaje: 15, ruta: '/juegos/ta-te-ti', disponible: true },
    { nombre: 'Sopa de letras', porcentaje: 10, ruta: '/juegos/sopa-de-letras', disponible: true },
  ];

  puedeJugarPorPrimeraVez(): boolean {
    return this._juegosService.puedeJugarPorPrimeraVez();
  }

  esClienteRegistrado(): boolean {
    return this._juegosService.esClienteRegistrado();
  }

  descuentoActual(): number | null {
    return this._juegosService.descuentoActual();
  }

  async avisarProximamente(nombre: string): Promise<void> {
    const toast = await this._toastController.create({
      message: `${nombre} está en construcción. ¡Pronto vas a poder jugarlo!`,
      duration: 3000,
      position: 'top',
      color: 'primary',
    });

    await toast.present();
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
