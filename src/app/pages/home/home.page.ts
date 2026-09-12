import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import {
  IonContent,
  IonButton,
  IonItem,
  IonLabel,
  IonDatetime,
  IonSkeletonText,
  ToastController
} from '@ionic/angular';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth/auth';
import { Carta } from '@app/services';
import { CartaItem } from '@app/models/carta.model';
import { ConfirmDialogComponent } from '../../components/ui/confirm-cartel/confirm-cartel.component';
import { Carrito } from '../carrito/carrito';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  imports: [
    IonContent,
    IonButton,
    IonItem,
    IonLabel,
    IonDatetime,
    IonSkeletonText,
    CurrencyPipe,
    ConfirmDialogComponent
  ],
})
export class HomePage implements OnInit {

  private authService = inject(Auth);
  private toastController = inject(ToastController);
  private cartaService = inject(Carta);
  private carrito = inject(Carrito);

  constructor(private router: Router) {
    // Calcular fecha máxima (1 mes exacto)
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(now.getMonth() + 1);

    this.maxDate = nextMonth.toISOString().split('T')[0];
  }

  async ngOnInit(): Promise<void> {
    this.isLoadingDestacados.set(true);

    const destacados = await this.cartaService.getSugeridos();

    this.isLoadingDestacados.set(false);

    this.destacados.set(destacados);
  }

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

  // ============================
  // PRODUCTOS DESTACADOS (sugerencias de la carta)
  // ============================

  destacados = signal<CartaItem[]>([]);
  isLoadingDestacados = signal(false);

  // ============================
  // LOGIN / LOGOUT
  // ============================

  irALogin(): void {
    this.router.navigate(['/login']);
  }

  async cerrarSesion(): Promise<void> {
    await this.authService.logout();

    this.enMesa = false;
    localStorage.removeItem('mesa');

    const toast = await this.toastController.create({
      message: 'Sesión cerrada correctamente.',
      duration: 3000,
      position: 'top',
      color: 'success'
    });
    await toast.present();

    void this.router.navigate(['/login']);
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
  // SOLICITAR CUENTA (punto 21, Lucas)
  // ============================

  // Placeholder: solo controla cuándo se ve el botón. La lógica real
  // de solicitud de cuenta/pago (punto 21) la arma Lucas.
  mostrarSolicitarCuenta(): boolean {
    return this.isLoggedIn() && this.enMesa && this.carrito.totalItems() > 0;
  }

  async solicitarCuenta(): Promise<void> {
    const toast = await this.toastController.create({
      message: 'Pronto vas a poder solicitar tu cuenta desde acá.',
      duration: 3000,
      position: 'top',
      color: 'primary'
    });
    await toast.present();
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