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
import { Carta, MesaCliente, SupabaseService, Vibracion, Waitlist } from '@app/services';
import { EPerfilUsuario } from '@app/enums';
import { CodigoQr } from '@app/models/qr.model';
import { CartaItem } from '@app/models/carta.model';
import { Pedido } from '@app/services/pedido/pedido';
import { EstadoPedidoComponent } from '@app/components/ui/estado-pedido/estado-pedido.component';
import { HeaderComponent } from '@app/components/ui/header/header.component';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { parseTableQr } from '@app/utils';

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

  constructor() {
    addIcons({
      'chevron-back-outline': chevronBackOutline,
      'chevron-forward-outline': chevronForwardOutline,
      'time-outline': timeOutline,
    });

    // escucha el estado del último pedido del cliente
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

  // estados

  // sesión iniciada
  isLoggedIn = computed(() => this.authService.usuarioActual() !== null);

  // el personal vuelve a la selección de acceso
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

  // mesa asignada por el metre
  enMesa = computed(() => this.mesaCliente.numero() !== null);

  // botones visibles según perfil y estado

  perfil = computed(() =>
    this.authService.obtenerPerfil(this.authService.usuarioActual())
  );

  esCliente = computed(
    () =>
      this.perfil() === EPerfilUsuario.ClienteRegistrado ||
      this.perfil() === EPerfilUsuario.ClienteAnonimo
  );

  estadoPedido = signal<string | null>(null);

  // el mozo ya confirmó el pedido, en cualquier etapa posterior
  pedidoRecibido = computed(() =>
    ['confirmado', 'en_preparacion', 'listo', 'entregado'].includes(this.estadoPedido() ?? '')
  );

  // botones que ve cada perfil
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
      escaner: cliente,
      consultas: (cliente && enMesa) || perfil === EPerfilUsuario.Mozo,
      estadoPedido: cliente && this.pedido.idUltimoPedido() !== null,
    };
  });

  hayAccesos = computed(() => {
    const botones = this.botones();
    return botones.estadoPedido || botones.escaner || botones.consultas;
  });

  // destacados y quiénes somos se abren en una ventana
  showDestacados = signal(false);
  showQuienesSomos = signal(false);

  // productos destacados

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

  // login y logout

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

  // botones principales

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

  // navegaciones

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

  // escáner qr

  escaneando = signal(false);

  async escanear(): Promise<void> {
    if (this.escaneando()) return;

    this.escaneando.set(true);
    try {
      const { camera } = await BarcodeScanner.requestPermissions();

      if (camera !== 'granted' && camera !== 'limited') {
        await this.mostrarToast('Necesitamos permiso de cámara para escanear el código.');
      
        return;
      }

      const { barcodes } = await BarcodeScanner.scan();
      
      if (barcodes.length === 0) return;

      const valor = barcodes[0].rawValue ?? '';

      if (valor === 'ingreso-local') {
        await this.procesarCodigo({ tipo: 'ingreso-local' });
        return;
      }

      // el cliente con mesa asignada también puede escanearla desde acá
      if (parseTableQr(valor)) {
        await this.vincularMesa(valor);
        return;
      }

      await this.vibracion.error();
      await this.mostrarToast('Ese código QR no corresponde al ingreso del local ni a una mesa.');
    } finally {
      this.escaneando.set(false);
    }
  }

  private async procesarCodigo(codigo: CodigoQr): Promise<void> {
    switch (codigo.tipo) {
      case 'ingreso-local':
        // await this.mostrarToast('La lista de espera todavía no está disponible.');
        try {
          const currentUser = this.authService.usuarioActual();

          // si ya está anotado no lo agrega de nuevo
          const entrada = await this._waitlistService.getMyEntry(currentUser.id);

          if (!entrada) {
            const nueva = await this._waitlistService.add({
              usuario_id: currentUser.id,
              estado: 'esperando',
            });

            // avisa al metre que hay un cliente nuevo
            try {
              await this._waitlistService.notifyNewWaitlist(nueva.id);
            } catch (error) {
              console.warn('No se pudo notificar al metre:', error);
            }
          }

          this.router.navigate(['/waiting-room']);
        } catch {
          await this.vibracion.error();
          await this.mostrarToast('No pudimos anotarte en la lista de espera. Probá de nuevo.');
        }

        break;
    }
  }

  // vincula al cliente con la mesa escaneada
  private async vincularMesa(valor: string): Promise<void> {
    try {
      const usuario = this.authService.usuarioActual();
      const resultado = await this._waitlistService.linkTable(usuario.id, valor);

      if (resultado.ok) {
        await this.mesaCliente.actualizar();
        await this.router.navigateByUrl('/carta');
        return;
      }

      await this.vibracion.error();

      if (resultado.reason === 'wrong_table') {
        await this.mostrarToast(`Esta no es tu mesa. Tenés asignada la mesa ${resultado.correctTableNumber}.`);
      } else {
        await this.mostrarToast('Todavía no tenés una mesa asignada. Pedile una al metre.');
      }
    } catch (error) {
      console.error('Error vinculando mesa:', error);
      await this.vibracion.error();
      await this.mostrarToast('No pudimos vincularte con la mesa. Intentá nuevamente.');
    }
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

  // estado del pedido

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

  // solicitar cuenta

  // provisorio hasta que esté la cuenta
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
