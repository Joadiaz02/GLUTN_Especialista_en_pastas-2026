import {
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import {
  IonContent,
  IonButton,
  IonSkeletonText,
  IonIcon,
  ToastController,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth/auth';
import { Carta } from '@app/services';
import { CartaItem } from '@app/models/carta.model';
import { ConfirmDialogComponent } from '../../components/ui/confirm-cartel/confirm-cartel.component';
import { Carrito } from '../carrito/carrito';
import { Pedido } from '@app/services/pedido/pedido';
import { EstadoPedidoComponent } from '@app/components/ui/estado-pedido/estado-pedido.component';

const DEMORA_FOTO_DESTACADO_MS = 3000;

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  imports: [
    IonContent,
    IonButton,
    IonSkeletonText,
    IonIcon,
    CurrencyPipe,
    ConfirmDialogComponent,
  ],
})
export class HomePage implements OnInit, OnDestroy {
  private router = inject(Router);

  private authService = inject(Auth);
  private toastController = inject(ToastController);
  private cartaService = inject(Carta);
  private carrito = inject(Carrito);
  protected pedido = inject(Pedido);
  private _fotoIntervalId: ReturnType<typeof setInterval> | null = null;
  private modalController = inject(ModalController);

  constructor() {
    addIcons({
      'chevron-back-outline': chevronBackOutline,
      'chevron-forward-outline': chevronForwardOutline,
    });
  }

  private mesaDePrueba(): string | null {
    if (!localStorage.getItem('mesa')) {
      localStorage.setItem('mesa', '4');
    }

    return localStorage.getItem('mesa');
  }

  async ngOnInit(): Promise<void> {
    this.isLoadingDestacados.set(true);

    const destacados = await this.cartaService.getSugeridos();

    this.isLoadingDestacados.set(false);

    this.destacados.set(destacados);
  }

  ngOnDestroy(): void {
    this.detenerCicloFotos();
  }

  // ============================
  // ESTADOS
  // ============================

  // Ya no es un booleano local: es un computed que lee directo del
  // signal de Auth. Se actualiza SOLO en cuanto Auth.usuarioActual
  // cambia (login, logout, refresh de sesión) — sin carreras de tiempo,
  // sin tener que "ir a preguntar" en ngOnInit.
  isLoggedIn = computed(() => this.authService.usuarioActual() !== null);

  // Provisorio hasta que la asignación de mesas (punto 10) deje la mesa
  // del cliente guardada: hoy se lee de la clave "mesa" del almacenamiento
  // local, la misma que la app borra al cerrar sesión.
  //
  // TEMPORAL: si todavía no hay mesa asignada, se hardcodea una para poder
  // probar el chat y "pedir la cuenta" como cliente. Sacar cuando el punto
  // 10 esté listo.
  enMesa = !!this.mesaDePrueba();

  showDestacados = false;
  showQuienesSomos = false;

  // ============================
  // PRODUCTOS DESTACADOS (sugerencias de la carta)
  // ============================

  destacados = signal<CartaItem[]>([]);
  isLoadingDestacados = signal(false);

  indiceDestacado = signal(0);
  indiceFotoDestacado = signal(0);

  productoDestacadoActual = computed<CartaItem | null>(
    () => this.destacados()[this.indiceDestacado()] ?? null
  );

  fotoDestacadaActual = computed(() => {
    const producto = this.productoDestacadoActual();
    if (!producto) return '';

    const fotos = [producto.foto_1, producto.foto_2, producto.foto_3];
    return fotos[this.indiceFotoDestacado()];
  });

  siguienteDestacado(): void {
    const total = this.destacados().length;
    if (total < 2) return;

    this.indiceDestacado.update((i) => (i + 1) % total);
    this.indiceFotoDestacado.set(0);
  }

  anteriorDestacado(): void {
    const total = this.destacados().length;
    if (total < 2) return;

    this.indiceDestacado.update((i) => (i - 1 + total) % total);
    this.indiceFotoDestacado.set(0);
  }

  private iniciarCicloFotos(): void {
    this.detenerCicloFotos();

    this._fotoIntervalId = setInterval(() => {
      this.indiceFotoDestacado.update((i) => (i + 1) % 3);
    }, DEMORA_FOTO_DESTACADO_MS);
  }

  private detenerCicloFotos(): void {
    if (this._fotoIntervalId !== null) {
      clearInterval(this._fotoIntervalId);
      this._fotoIntervalId = null;
    }
  }

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
      color: 'success',
    });
    await toast.present();

    void this.router.navigate(['/login']);
  }

  // ============================
  // BOTONES PRINCIPALES
  // ============================

  toggleDestacados() {
    this.showDestacados = !this.showDestacados;
    this.showQuienesSomos = false;

    if (this.showDestacados) {
      this.iniciarCicloFotos();
    } else {
      this.detenerCicloFotos();
    }
  }

  toggleQuienesSomos() {
    this.showQuienesSomos = !this.showQuienesSomos;
    this.showDestacados = false;
    this.detenerCicloFotos();
  }

  // ============================
  // NAVEGACIONES
  // ============================

  goToCarta() {
    this.router.navigate(['/carta']);
  }

  goToJuegos() {
    this.router.navigate(['/juegos'], { state: { origenValido: true } });
  }

  goToReservas() {
    this.router.navigate(['/reservas']);
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
      color: 'primary',
    });
    await toast.present();
  }

  async verEstadoPedido(idPedido: string) {
    const modal = await this.modalController.create({
      component: EstadoPedidoComponent,
      componentProps: { idPedido },
      breakpoints: [0, 0.4],
      initialBreakpoint: 0.2,
    });

    await modal.present();
  }
}
