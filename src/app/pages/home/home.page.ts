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
import { SeleccionMesaComponent } from '@app/components/ui/seleccion-mesa/seleccion-mesa.component';
import {
  IonContent,
  IonFooter,
  IonButton,
  IonIcon,
  IonModal,
  ToastController,
  ModalController,
  IonHeader,
  IonToolbar,
  IonButtons,
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
import {
  Carta,
  MesaCliente,
  SupabaseService,
  Vibracion,
  Waitlist,
} from '@app/services';
import { EPerfilUsuario } from '@app/enums';
import { CodigoQr } from '@app/models/qr.model';
import { CartaItem } from '@app/models/carta.model';
import { Pedido } from '@app/services/pedido/pedido';
import { EstadoPedidoComponent } from '@app/components/ui/estado-pedido/estado-pedido.component';
import { HeaderComponent } from '@app/components/ui/header/header.component';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { parseTipQr } from '@app/utils';
import { ConfirmDialogComponent } from '@app/components/ui/confirm-cartel/confirm-cartel.component';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { MiCuentaComponent } from '@app/components/ui/mi-cuenta/mi-cuenta.component';
import { Propina } from '@app/services/propina/propina';

const DEMORA_FOTO_DESTACADO_MS = 3000;

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
    IonHeader,
    IonToolbar,
    IonButtons,
    ConfirmDialogComponent,
    ConfirmVolverComponent,
    MiCuentaComponent,
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
  private supabaseService = inject(SupabaseService);
  private vibracion = inject(Vibracion);
  private mesaCliente = inject(MesaCliente);
  private _canalPedido: RealtimeChannel | null = null;
  private _waitlistService = inject(Waitlist);
  private _propinaService = inject(Propina);

  constructor() {
    addIcons({
      'chevron-back-outline': chevronBackOutline,
      'chevron-forward-outline': chevronForwardOutline,
      'time-outline': timeOutline,
    });

    // Escucha los pedidos del cliente. Se vuelve a suscribir cuando
    // cambia el último pedido (por ejemplo, al crear uno nuevo).
    effect(() => {
      this.pedido.idUltimoPedido();
      untracked(() => void this.escucharPedidos());
    });

    // Cuando el mozo entrega la cuenta, el cliente va directo a verla.
    effect(() => {
      if (this.estadoCuenta() === 'cuenta_entregada') {
        untracked(() => {
          if (!this.router.url.startsWith('/cuenta')) {
            void this.router.navigate(['/cuenta']);
          }
        });
      }
    });
  }

  async ngOnInit(): Promise<void> {
    this.isLoadingDestacados.set(true);

    try {
      this.destacados.set(await this.cartaService.getSugeridos());
    } catch (error) {
      void this.vibracion.error();

      await this.mostrarToast(
        error instanceof Error
          ? error.message
          : 'No pudimos cargar los productos destacados.',
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

  // Estados

  loading = signal(false);

  // Sesión iniciada

  isLoggedIn = computed(() => this.authService.usuarioActual() !== null);

  // El personal vuelve a su panel.

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

  // Mesa asignada por el metre.

  enMesa = computed(() => this.mesaCliente.numero() !== null);

  // Botones visibles según perfil y estado.

  perfil = computed(() =>
    this.authService.obtenerPerfil(this.authService.usuarioActual())
  );

  esCliente = computed(
    () =>
      this.perfil() === EPerfilUsuario.ClienteRegistrado ||
      this.perfil() === EPerfilUsuario.ClienteAnonimo
  );

  // Estados de todos los pedidos activos del cliente.

  private estados = computed(() =>
    this.pedido.pedidosActivos().map((p) => p.estado_pedido)
  );

  // Hay al menos un pedido para consultar.

  hayPedidos = computed(() => this.estados().length > 0);

  // El mozo ya confirmó algún pedido, en cualquier etapa posterior.

  pedidoRecibido = computed(() =>
    this.estados().some((e) => e !== 'pendiente' && e !== 'rechazado')
  );

  // Estado de la cuenta, si ya fue entregada o pagada por el cliente.

  estadoCuenta = computed<'cuenta_entregada' | 'pago_realizado' | null>(() => {
    const e = this.estados();

    if (e.includes('cuenta_entregada')) return 'cuenta_entregada';
    if (e.includes('pago_realizado')) return 'pago_realizado';

    return null;
  });

  // Botones que ve cada perfil.

  botones = computed(() => {
    const perfil = this.perfil();
    const cliente = this.esCliente();
    const enMesa = this.enMesa();
    const pedidoRecibido = this.pedidoRecibido();

    return {
      // Reservas oculto hasta la segunda entrega.
      reservas: false,
      carta: cliente ? enMesa : perfil !== null,
      juegos: cliente && pedidoRecibido,

      // El anónimo es un usuario nuevo en cada visita.
      facturas: perfil === EPerfilUsuario.ClienteRegistrado,

      encuestas:
        cliente ||
        perfil === EPerfilUsuario.Dueno ||
        perfil === EPerfilUsuario.Supervisor,

      escaner: cliente,
      consultas: (cliente && enMesa) || perfil === EPerfilUsuario.Mozo,

      estadoPedido: cliente && this.hayPedidos(),

      verCuenta: cliente && this.estadoCuenta() !== null,
    };
  });

  hayAccesos = computed(() => {
    const botones = this.botones();

    return botones.estadoPedido || botones.escaner || botones.consultas;
  });

  // Destacados y quiénes somos se abren en una ventana.

  showDestacados = signal(false);
  showQuienesSomos = signal(false);

  // Productos destacados.

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

  // Login y logout.

  irALogin(): void {
    this.router.navigate(['/login']);
  }

  async volver(): Promise<void> {
    if (this.esPersonal()) {
      // El personal vuelve al panel.
      void this.router.navigate(['/admin']);
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

  // Botones principales.

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

  // Navegaciones.

  goToCarta() {
    this.router.navigate(['/carta']);
  }

  goToJuegos() {
    this.router.navigate(['/juegos'], {
      state: { origenValido: true },
    });
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

  goToFacturas() {
    this.router.navigate(['/facturas']);
  }

  // Escáner QR.

  escaneando = signal(false);

  async escanear(): Promise<void> {
    if (this.escaneando()) return;

    this.escaneando.set(true);

    try {
      const { camera } = await BarcodeScanner.requestPermissions();

      if (camera !== 'granted' && camera !== 'limited') {
        await this.mostrarToast(
          'Necesitamos permiso de cámara para escanear el código.'
        );

        return;
      }

      const { barcodes } = await BarcodeScanner.scan();

      if (barcodes.length === 0) return;

      const valor = barcodes[0].rawValue ?? '';

      // if ('ingreso-local' === 'ingreso-local') {
      if (valor === 'ingreso-local') {
        this.loading.set(true);

        try {
          await this.procesarCodigo({ tipo: 'ingreso-local' });
        } finally {
          this.loading.set(false);
        }

        return;
      }

      // El cliente con mesa asignada también puede escanearla desde acá.
      // if (parseTableQr(valor)) {
      //   await this.vincularMesa(valor);
      //   return;
      // }

      await this.vibracion.error();

      await this.mostrarToast(
        'Ese código QR no corresponde al ingreso, a una mesa ni a una propina.'
      );
    } catch (error) {
      console.error('Error al escanear:', error);

      await this.vibracion.error();

      await this.mostrarToast(
        'No pudimos abrir el escáner. Intentá de nuevo.',
        'danger'
      );
    } finally {
      this.escaneando.set(false);
    }
  }

  // Escaneo del QR de propina para pedir la cuenta.

  private async escanearPropina(): Promise<void> {
    if (this.escaneando()) return;

    this.escaneando.set(true);

    try {
      const { camera } = await BarcodeScanner.requestPermissions();

      if (camera !== 'granted' && camera !== 'limited') {
        await this.mostrarToast(
          'Necesitamos permiso de cámara para escanear el código.'
        );
        return;
      }

      const { barcodes } = await BarcodeScanner.scan();

      if (barcodes.length === 0) return;

      const valor = barcodes[0].rawValue ?? '';
      const porcentaje = parseTipQr(valor);

      if (porcentaje === null) {
        await this.vibracion.error();
        await this.mostrarToast(
          'El código escaneado no es de propina. Por favor, volvé a intentarlo.'
        );
        return;
      }

      const ok = await this.pedirCuenta(porcentaje);

      if (!ok) return;

      this._propinaService.setPropinaPorcentaje(porcentaje);

      await this.mostrarToast(
        'El mozo ahora te llevará la cuenta. Disfrutá del lugar mientras esperás.'
      );
    } catch (error) {
      console.error('Error al escanear propina:', error);

      await this.vibracion.error();

      await this.mostrarToast(
        'No pudimos abrir el escáner. Intentá de nuevo.',
        'danger'
      );
    } finally {
      this.escaneando.set(false);
    }
  }

  // Devuelve true si la cuenta se pidió correctamente.
  private async pedirCuenta(porcentaje: number): Promise<boolean> {
    const usuario = this.authService.usuarioActual();

    if (!usuario) {
      return false;
    }

    try {
      await this.pedido.solicitarCuenta(usuario.id, porcentaje);
      return true;
    } catch (error) {
      console.error('Error al pedir la cuenta:', error);

      await this.vibracion.error();

      await this.mostrarToast(
        error instanceof Error
          ? error.message
          : 'No pudimos pedir la cuenta. Intentá de nuevo.',
        'danger'
      );

      return false;
    }
  }

  private async procesarCodigo(codigo: CodigoQr): Promise<void> {
    switch (codigo.tipo) {
      case 'ingreso-local':
        try {
          const currentUser = this.authService.usuarioActual();

          if (!currentUser?.id) {
            await this.mostrarToast(
              'No pudimos identificar tu usuario. Volvé a iniciar sesión.',
              'danger'
            );
            return;
          }

          // Verificamos si el cliente ya está anotado.
          const entrada = await this._waitlistService.getMyEntry(
            currentUser.id
          );

          // Si todavía no está anotado, solicitamos sus preferencias.
          if (!entrada) {
            const modal = await this.modalController.create({
              component: SeleccionMesaComponent,
              cssClass: 'seleccion-mesa-modal',
              backdropDismiss: false,
            });

            await modal.present();

            const { data, role } = await modal.onDidDismiss<{
              comensales: number;
              consideraciones: string;
            }>();

            // Si cancela, no se lo agrega a la lista.
            if (role !== 'confirm' || !data) {
              return;
            }

            // Creamos la entrada con los datos seleccionados.
            const nueva = await this._waitlistService.add({
              usuario_id: currentUser.id,
              estado: 'esperando',
              comensales: data.comensales,
              consideraciones: [data.consideraciones],
            });

            // Notificamos al metre.
            try {
              await this._waitlistService.notifyNewWaitlist(nueva.id);
            } catch (error) {
              console.warn('No se pudo notificar al metre:', error);
            }
          }

          // Si ya estaba anotado, también puede ingresar directamente.
          await this.router.navigate(['/waiting-room']);
        } catch (error) {
          console.error(
            'Error registrando cliente en lista de espera:',
            error
          );

          await this.vibracion.error();

          await this.mostrarToast(
            'No pudimos anotarte en la lista de espera. Probá de nuevo.',
            'danger'
          );
        }

        break;
    }
  }

  // Vincula al cliente con la mesa escaneada.

  private async vincularMesa(valor: string): Promise<void> {
    try {
      const usuario = this.authService.usuarioActual();

      if (!usuario) return;

      const resultado = await this._waitlistService.linkTable(
        usuario.id,
        valor
      );

      if (resultado.ok) {
        await this.mesaCliente.actualizar();
        await this.router.navigateByUrl('/carta');
        return;
      }

      await this.vibracion.error();

      if (resultado.reason === 'wrong_table') {
        await this.mostrarToast(
          `Esta no es tu mesa. Tenés asignada la mesa ${resultado.correctTableNumber}.`
        );
      } else {
        await this.mostrarToast(
          'Todavía no tenés una mesa asignada. Pedile una al metre.'
        );
      }
    } catch (error) {
      console.error('Error vinculando mesa:', error);

      await this.vibracion.error();

      await this.mostrarToast(
        'No pudimos vincularte con la mesa. Intentá nuevamente.'
      );
    }
  }

  private async mostrarToast(
    mensaje: string,
    color = 'primary'
  ): Promise<void> {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      position: 'top',
      color,
    });

    await toast.present();
  }

  // Estado de los pedidos.

  private async escucharPedidos(): Promise<void> {
    this.dejarDeEscucharPedido();

    const usuario = this.authService.usuarioActual();

    if (!usuario) return;

    await this.pedido.cargarPedidosActivos();

    this._canalPedido = this.supabaseService.client
      .channel(`home-pedidos-${usuario.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pedido',
          filter: `id_usuario=eq.${usuario.id}`,
        },
        () => void this.pedido.cargarPedidosActivos()
      )
      .subscribe();
  }

  private dejarDeEscucharPedido(): void {
    if (this._canalPedido) {
      void this.supabaseService.client.removeChannel(this._canalPedido);

      this._canalPedido = null;
    }
  }

  // Ver la cuenta.

  goToCuenta() {
    this.router.navigate(['/cuenta']);
  }

  // Modal para consultar el estado de los pedidos.

  async verEstadoPedido(): Promise<void> {
    const modal = await this.modalController.create({
      component: EstadoPedidoComponent,
      cssClass: 'estado-pedido-modal',
      backdropDismiss: true,
    });

    await modal.present();

    // didDismiss espera a que termine la animación de cierre
    // antes de abrir la cámara.
    const { role } = await modal.onDidDismiss();

    if (role === 'solicitar-cuenta') {
      await this.escanearPropina();
    }
  }
}