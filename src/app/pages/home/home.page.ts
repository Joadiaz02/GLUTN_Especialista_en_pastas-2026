import { Component, computed, inject } from '@angular/core';
import {
  IonContent,
  IonButton,
  IonList,
  IonListHeader,
  IonItem,
  IonThumbnail,
  IonLabel,
  IonDatetime,
  ToastController
} from '@ionic/angular';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth/auth';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  imports: [
    IonContent,
    IonButton,
    IonList,
    IonListHeader,
    IonItem,
    IonThumbnail,
    IonLabel,
    IonDatetime
  ],
})
export class HomePage {

  private authService = inject(Auth);
  private toastController = inject(ToastController);

  // ============================
  // ESTADOS
  // ============================

  // Ya no es un booleano local: es un computed que lee directo del
  // signal de Auth. Se actualiza SOLO en cuanto Auth.usuarioActual
  // cambia (login, logout, refresh de sesión) — sin carreras de tiempo,
  // sin tener que "ir a preguntar" en ngOnInit.
  isLoggedIn = computed(() => this.authService.usuarioActual() !== null);

  enMesa = false;

  showReserva = false;
  showDestacados = false;
  showQuienesSomos = false;

  // ============================
  // FECHA Y HORA
  // ============================

  today = new Date().toISOString().split('T')[0];
  maxDate: string;

  fecha = '';
  hora = '';

  constructor(private router: Router) {
    // Calcular fecha máxima (1 mes exacto)
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(now.getMonth() + 1);

    this.maxDate = nextMonth.toISOString().split('T')[0];
  }

  // ============================
  // PRODUCTOS (simulado)
  // ============================

  productos = [
    { nombre: 'Ravioles', imagen: 'assets/icons/ravioles.png', detalle: 'Clásicos y especiales' },
    { nombre: 'Sorrentinos', imagen: 'assets/icons/sorrentinos.png', detalle: 'Jamón y queso, calabaza' },
    { nombre: 'Fideos', imagen: 'assets/icons/fideos.png', detalle: 'Spaghetti, tallarines' }
  ];

  // ============================
  // LOGIN / LOGOUT
  // ============================

  async onLoginClick(): Promise<void> {
    if (this.isLoggedIn()) {
      await this.authService.logout();
      this.enMesa = false;
      localStorage.removeItem('mesa');
    } else {
      this.router.navigate(['/login']);
    }
  }

  // ============================
  // BOTONES PRINCIPALES
  // ============================

  toggleReserva() {
    this.showReserva = !this.showReserva;
    this.showDestacados = false;
    this.showQuienesSomos = false;
  }

  toggleDestacados() {
    this.showDestacados = !this.showDestacados;
    this.showReserva = false;
    this.showQuienesSomos = false;
  }

  toggleQuienesSomos() {
    this.showQuienesSomos = !this.showQuienesSomos;
    this.showReserva = false;
    this.showDestacados = false;
  }

  // ============================
  // NAVEGACIONES
  // ============================

  goToCarta() {
    this.router.navigate(['/carta']);
  }

  goToChat() {
    if (this.enMesa) {
      this.router.navigate(['/chat']);
    }
  }

  goToEncuestas() {
    this.router.navigate(['/encuestas']);
  }

  goToScanner() {
    this.router.navigate(['/scanner']);
  }

  // ============================
  // RESERVA
  // ============================

  async solicitarReserva(): Promise<void> {
    console.log('Reserva solicitada:', this.fecha, this.hora);

    if (!this.fecha || !this.hora) {
      const toastError = await this.toastController.create({
        message: 'Por favor seleccioná fecha y hora para la reserva.',
        duration: 3000,
        position: 'top',
        color: 'danger'
      });
      await toastError.present();
      return;
    }

    this.enMesa = true;
    localStorage.setItem('mesa', 'true');

    const toastOk = await this.toastController.create({
      message: 'Reserva enviada correctamente.',
      duration: 3000,
      position: 'top',
      color: 'success'
    });
    await toastOk.present();
  }

  formatDate(value: string | string[] | null | undefined): string {
    if (!value) return '';
    if (Array.isArray(value)) return value[0] ?? '';
    return value;
  }
}