import {
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import {
  IonContent,
  IonFooter,
  IonButton,
  IonIcon,
  IonModal,
  ToastController,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline,
  chevronForwardOutline,
  timeOutline,
} from 'ionicons/icons';
import { Router } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Auth } from '../../services/auth/auth';
import { Carta, EscanerQr, MesaCliente, SupabaseService, Table, Vibracion } from '@app/services';
import { EPerfilUsuario } from '@app/enums';
import { CodigoQr } from '@app/models/qr.model';
import { CartaItem } from '@app/models/carta.model';
import { Pedido } from '@app/services/pedido/pedido';
import { EstadoPedidoComponent } from '@app/components/ui/estado-pedido/estado-pedido.component';
import { HeaderComponent } from '@app/components/ui/header/header.component';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';

const DEMORA_FOTO_DESTACADO_MS = 3000;

const TIPOS_MESA: Record<string, string> = {
  estandar: 'Estándar',
  vip: 'VIP',
  movilidad_reducida: 'Movilidad reducida',
  vip_movilidad_reducida: 'VIP con movilidad reducida',
};

const DISPONIBILIDADES_MESA: Record<string, string> = {
  vacia: 'Vacía',
  ocupada: 'Ocupada',
  reservada: 'Reservada',
};

// Perfiles del personal que pueden escanear el QR de mesa para ver su info.
const PERFILES_ESCANER_PERSONAL: string[] = [
  EPerfilUsuario.Dueno,
  EPerfilUsuario.Supervisor,
  EPerfilUsuario.Metre,
  EPerfilUsuario.Mozo,
];

interface MesaEscaneada {
  numero: number;
  capacidad: number;
  tipo: string;
  disponibilidad: string | null;
}

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  imports: [
    HeaderComponent,
    IonContent,
    IonFooter,
    IonButton,
    IonIcon,
    IonModal,
    CurrencyPipe,
    SpinnerLogoComponent,
  ],
})
export class HomePage implements OnInit, OnDestroy {
  private router = inject(Router);

  private authService = inject(Auth);
  private toastController = inject(ToastController);
  private cartaService = inject(Carta);
  protected pedido = inject(Pedido);
  private _fotoIntervalId: ReturnType<typeof setInterval> | null = null;
  private modalController = inject(ModalController);
  private escanerQr = inject(EscanerQr);
  private tableService = inject(Table);
  private supabaseService = inject(SupabaseService);
  private vibracion = inject(Vibracion);
  private mesaCliente = inject(MesaCliente);
  private _canalPedido: RealtimeChannel | null = null;

  constructor() {
    addIcons({
      'chevron-back-outline': chevronBackOutline,
      'chevron-forward-outline': chevronForwardOutline,
      'time-outline': timeOutline,
    });

    // Cada vez que el cliente hace un pedido, se escucha su estado para
    // habilitar los botones que dependen de él (juegos, solicitar cuenta).
    effect(() => {
      const idPedido = this.pedido.idUltimoPedido();
      untracked(() => void this.escucharPedido(idPedido));
    });
  }


  async ngOnInit(): Promise<void> {
    this.isLoadingDestacados.set(true);

    try {
      this.destacados.set(await this.cartaService.getSugeridos());
    } catch (error) {
      void this.vibracion.error();
      await this.mostrarToast(
        error instanceof Error ? error.message : 'No pudimos cargar los productos destacados.',
        'danger'
      );
    } finally {
      this.isLoadingDestacados.set(false);
    }
  }

  ngOnDestroy(): void {
    this.detenerCicloFotos();
    this.dejarDeEscucharPedido();
  }

  // ============================
  // ESTADOS
  // ============================

  // Ya no es un booleano local: es un computed que lee directo del
  // signal de Auth. Se actualiza SOLO en cuanto Auth.usuarioActual
  // cambia (login, logout, refresh de sesión) — sin carreras de tiempo,
  // sin tener que "ir a preguntar" en ngOnInit.
  isLoggedIn = computed(() => this.authService.usuarioActual() !== null);

  // El personal entra al Home desde la selección de acceso; los clientes,
  // desde el login o el acceso rápido.
  esPersonal = computed(() =>
    this.authService.esPersonal(this.authService.usuarioActual())
  );

  mensajeVolver = computed(() => {
    if (this.esPersonal()) {
      return 'Vas a volver a la selección de acceso.';
    }

    if (this.isLoggedIn()) {
      return 'Se va a cerrar tu sesión y vas a volver a la pantalla de ingreso.';
    }

    return 'Vas a volver a la pantalla de ingreso.';
  });

  // Mesa asignada por el metre (punto 10). Habilita la carta y la
  // consulta al mozo, y se actualiza sola cuando se la asignan.
  enMesa = computed(() => this.mesaCliente.numero() !== null);

  // ============================
  // VISIBILIDAD DE BOTONES (según perfil y estado del cliente)
  // ============================

  perfil = computed(() =>
    this.authService.obtenerPerfil(this.authService.usuarioActual())
  );

  esCliente = computed(
    () =>
      this.perfil() === EPerfilUsuario.ClienteRegistrado ||
      this.perfil() === EPerfilUsuario.ClienteAnonimo
  );

  estadoPedido = signal<string | null>(null);

  // TEMPORAL: el estado "recibido" (punto 19, confirmación de la entrega)
  // todavía no existe. Mientras tanto, el pedido se toma como recibido
  // cuando el mozo lo acepta. Cambiar a 'entregado' cuando esté el punto 19.
  pedidoRecibido = computed(() => this.estadoPedido() === 'confirmado');

  // Qué botones ve cada perfil (según el TP). Destacados y Quienes somos
  // los ven todos.
  botones = computed(() => {
    const perfil = this.perfil();
    const cliente = this.esCliente();
    const enMesa = this.enMesa();
    const pedidoRecibido = this.pedidoRecibido();

    return {
      reservas: perfil === EPerfilUsuario.ClienteRegistrado,
      carta: cliente ? enMesa : perfil !== null,
      juegos: cliente && pedidoRecibido,
      solicitarCuenta: cliente && pedidoRecibido,
      encuestas:
        cliente ||
        perfil === EPerfilUsuario.Dueno ||
        perfil === EPerfilUsuario.Supervisor,
      escaner: cliente || PERFILES_ESCANER_PERSONAL.includes(perfil ?? ''),
      consultas: (cliente && enMesa) || perfil === EPerfilUsuario.Mozo,
      estadoPedido: cliente && this.pedido.idUltimoPedido() !== null,
    };
  });

  hayAccesos = computed(() => {
    const botones = this.botones();
    return botones.estadoPedido || botones.escaner || botones.consultas;
  });

  // Destacados y Quienes somos se abren en una ventana aparte para que
  // el Home entre completo en la pantalla, sin scroll.
  showDestacados = signal(false);
  showQuienesSomos = signal(false);

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

  async volver(): Promise<void> {
    if (this.esPersonal()) {
      void this.router.navigate(['/seleccion-acceso']);
      return;
    }

    const pantallaIngreso = this.authService.obtenerPantallaIngreso();

    if (this.isLoggedIn()) {
      await this.authService.logout();
      localStorage.removeItem('mesa');
    }

    void this.router.navigate([pantallaIngreso]);
  }

  async cerrarSesion(): Promise<void> {
    await this.authService.logout();

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

  abrirDestacados(): void {
    this.showDestacados.set(true);
    this.iniciarCicloFotos();
  }

  cerrarDestacados(): void {
    this.showDestacados.set(false);
    this.detenerCicloFotos();
  }

  abrirQuienesSomos(): void {
    this.showQuienesSomos.set(true);
  }

  cerrarQuienesSomos(): void {
    this.showQuienesSomos.set(false);
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
    this.router.navigate(['/chat']);
  }

  goToEncuestas() {
    this.router.navigate(['/encuestas']);
  }

  // ============================
  // ESCÁNER QR (ingreso al local, mesa y propinas)
  // ============================

  escaneando = signal(false);
  mesaEscaneada = signal<MesaEscaneada | null>(null);

  async escanear(): Promise<void> {
    if (this.escaneando()) return;

    this.escaneando.set(true);
    try {
      const codigo = await this.escanerQr.escanear();
      if (codigo) await this.procesarCodigo(codigo);
    } finally {
      this.escaneando.set(false);
    }
  }

  private async procesarCodigo(codigo: CodigoQr): Promise<void> {
    switch (codigo.tipo) {
      case 'mesa':
        await this.mostrarMesa(codigo.id);
        break;

      // Lista de espera (punto 9): todavía no está armada.
      case 'ingreso':
        await this.mostrarToast('La lista de espera todavía no está disponible.');
        break;

      // Propina y pago de la cuenta (punto 21): todavía no están armados.
      case 'propina':
        await this.mostrarToast(
          `Propina del ${codigo.porcentaje}% leída. El pago de la cuenta todavía no está disponible.`
        );
        break;
    }
  }

  private async mostrarMesa(idMesa: string): Promise<void> {
    const mesa = await this.tableService.getTableById(idMesa);

    if (!mesa) {
      void this.vibracion.error();
      await this.mostrarToast('No encontramos esa mesa.', 'danger');
      return;
    }

    // Punto 11: el cliente que escanea el QR de SU mesa ve la carta.
    // El personal, en cambio, ve los datos de la mesa.
    if (this.esCliente()) {
      await this.abrirCartaDeMesa(String(mesa.numero));
      return;
    }

    this.mesaEscaneada.set({
      numero: mesa.numero,
      capacidad: mesa.capacidad,
      tipo: TIPOS_MESA[mesa.tipo] ?? mesa.tipo,
      disponibilidad: DISPONIBILIDADES_MESA[mesa.disponibilidad ?? mesa.estado] ?? null,
    });
  }

  private async abrirCartaDeMesa(numeroEscaneado: string): Promise<void> {
    // Por si el metre la asignó recién y todavía no llegó el aviso en vivo.
    if (!this.mesaCliente.numero()) {
      await this.mesaCliente.actualizar();
    }

    const miMesa = this.mesaCliente.numero();

    if (!miMesa) {
      void this.vibracion.error();
      await this.mostrarToast(
        'Todavía no tenés una mesa asignada. Pedile una al metre.',
        'danger'
      );
      return;
    }

    if (miMesa !== numeroEscaneado) {
      void this.vibracion.error();
      await this.mostrarToast(
        `Este código es de la mesa ${numeroEscaneado}. Tu mesa es la ${miMesa}.`,
        'danger'
      );
      return;
    }

    await this.router.navigate(['/carta']);
  }

  cerrarMesa(): void {
    this.mesaEscaneada.set(null);
  }

  private async mostrarToast(mensaje: string, color = 'primary'): Promise<void> {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      position: 'top',
      color,
    });
    await toast.present();
  }

  // ============================
  // ESTADO DEL PEDIDO
  // ============================

  private async escucharPedido(idPedido: string | null): Promise<void> {
    this.dejarDeEscucharPedido();
    this.estadoPedido.set(null);

    if (!idPedido) return;

    const { data } = await this.supabaseService.client
      .from('pedido')
      .select('estado_pedido')
      .eq('id_pedido', idPedido)
      .maybeSingle();

    this.estadoPedido.set(data?.estado_pedido ?? null);

    this._canalPedido = this.supabaseService.client
      .channel(`home-pedido-${idPedido}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pedido',
          filter: `id_pedido=eq.${idPedido}`,
        },
        (payload) => this.estadoPedido.set(payload.new['estado_pedido'] ?? null)
      )
      .subscribe();
  }

  private dejarDeEscucharPedido(): void {
    if (this._canalPedido) {
      void this.supabaseService.client.removeChannel(this._canalPedido);
      this._canalPedido = null;
    }
  }

  // ============================
  // SOLICITAR CUENTA (punto 21, Lucas)
  // ============================

  // Placeholder: el botón aparece con el pedido recibido. La lógica real
  // de la cuenta (aviso al mozo, propina y pago) la arma Lucas.
  async solicitarCuenta(): Promise<void> {
    await this.mostrarToast('Pronto vas a poder solicitar la cuenta desde acá.');
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
