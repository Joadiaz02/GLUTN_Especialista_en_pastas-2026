
import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { IonButton, IonContent, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { ListaFilasDirective } from '@app/directives/lista-filas/lista-filas.directive';
import { Auth, Cocina, Confirm, PedidoCocina, Vibracion } from '@app/services';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { HeaderComponent } from '@app/components/ui/header/header.component';
import { addIcons } from 'ionicons';
import { closeCircleOutline } from 'ionicons/icons';

export type VistaCocina = 'por_recibir' | 'en_preparacion';

export interface SlideCocina extends PedidoCocina {
  numeroMesa: string;
  numeroEnMesa: number;
  totalEnMesa: number;
}

export interface GrupoMesaCocina {
  numeroMesa: string;
  pedidos: SlideCocina[];
}

@Component({
  selector: 'app-cocina',
  standalone: true,
  templateUrl: './cocina.page.html',
  styleUrls: ['./cocina.page.scss'],
  imports: [
    HeaderComponent,
    DatePipe,
    IonButton,
    IonContent,
    SpinnerLogoComponent,
    ListaFilasDirective,
  ],
})
export class CocinaPage implements OnDestroy {
  cocina = inject(Cocina);

  private _auth = inject(Auth);
  private _vibracion = inject(Vibracion);
  private _confirm = inject(Confirm);
  private _toastController = inject(ToastController);
  private _router = inject(Router);

  private _viewport = viewChild<ElementRef<HTMLElement>>('viewport');

  procesando = signal<string | null>(null);

  vista = signal<VistaCocina>('por_recibir');

  // Navegación horizontal entre mesas.
  indiceMesaActual = signal(0);

  // Navegación vertical entre pedidos.
  indicePedidoActual = signal(0);

  // Todos los pedidos de Cocina, con su número de mesa.
  private _todos = computed(() =>
    this.cocina.mesas().flatMap((mesa) =>
      mesa.pedidos.map((pedido) => ({
        ...pedido,
        numeroMesa: mesa.numeroMesa,
      }))
    )
  );

  cantidadPorRecibir = computed(
    () => this._todos().filter((p) => !p.estadoCocina).length
  );

  cantidadEnPreparacion = computed(
    () => this._todos().filter((p) => !!p.estadoCocina).length
  );

  // Pedidos de la pestaña seleccionada.
  pedidos = computed<SlideCocina[]>(() => {
    const porRecibir = this.vista() === 'por_recibir';

    const lista = this._todos().filter((p) =>
      porRecibir ? !p.estadoCocina : !!p.estadoCocina
    );

    const totalPorMesa = new Map<string, number>();

    for (const pedido of lista) {
      totalPorMesa.set(
        pedido.numeroMesa,
        (totalPorMesa.get(pedido.numeroMesa) ?? 0) + 1
      );
    }

    const vistosPorMesa = new Map<string, number>();

    return lista.map((pedido) => {
      const numero =
        (vistosPorMesa.get(pedido.numeroMesa) ?? 0) + 1;

      vistosPorMesa.set(pedido.numeroMesa, numero);

      return {
        ...pedido,
        numeroEnMesa: numero,
        totalEnMesa: totalPorMesa.get(pedido.numeroMesa)!,
      };
    });
  });

  // Agrupamos por mesa, sin perder el orden de los pedidos.
  mesas = computed<GrupoMesaCocina[]>(() => {
    const grupos = new Map<string, SlideCocina[]>();

    for (const pedido of this.pedidos()) {
      const lista = grupos.get(pedido.numeroMesa) ?? [];

      lista.push(pedido);
      grupos.set(pedido.numeroMesa, lista);
    }

    return Array.from(grupos.entries()).map(
      ([numeroMesa, pedidos]) => ({
        numeroMesa,
        pedidos,
      })
    );
  });

  constructor() {
    addIcons({
      'close-circle-outline': closeCircleOutline,
    });

    // Si desaparece una mesa o un pedido, ajustamos los índices.
    effect(() => {
      const mesas = this.mesas();

      const ultimaMesa = Math.max(0, mesas.length - 1);

      if (this.indiceMesaActual() > ultimaMesa) {
        this.indiceMesaActual.set(ultimaMesa);
      }

      const mesaActual = mesas[this.indiceMesaActual()];

      const ultimoPedido = Math.max(
        0,
        (mesaActual?.pedidos.length ?? 1) - 1
      );

      if (this.indicePedidoActual() > ultimoPedido) {
        this.indicePedidoActual.set(ultimoPedido);
      }
    });
  }

  ionViewWillEnter(): void {
    void this.iniciar();
  }

  ngOnDestroy(): void {
    this.cocina.detener();
  }

  recibir(pedido: PedidoCocina): Promise<void> {
    console.log('COCINERO POR RECIBIR | CLICK EN ACEPTAR');
    console.log(pedido);

    return this.procesar(pedido, async () => {
      const recibido = await this.cocina.recibir(pedido);

      if (recibido) {
        await this.avisar(
          'Pedido recibido. Lo tenés en "En preparación" y el cliente ya lo ve.',
          'success'
        );
      } else {
        void this._vibracion.errorValidacion();

        await this.avisar(
          'Otro cocinero ya había recibido este pedido.',
          'warning'
        );
      }
    });
  }

  entregar(pedido: PedidoCocina): Promise<void> {
    return this.procesar(pedido, async () => {
      const completo = await this.cocina.entregar(pedido);

      await this.avisar(
        completo
          ? 'Pedido listo. Se les avisó a los mozos.'
          : 'Listo. Falta que el bar termine las bebidas para avisar al mozo.',
        'success'
      );
    });
  }

  async rechazar(pedido: SlideCocina): Promise<void> {
    const confirmado = await this._confirm.preguntar({
      titulo: '¿Rechazar el pedido?',
      mensaje: `El pedido de la mesa ${pedido.numeroMesa} vuelve al cliente para que lo modifique y lo reenvíe.`,
      textoConfirmar: 'Rechazar',
      colorConfirmar: 'danger',
      icono: 'close-circle-outline',
    });

    if (!confirmado) return;

    return this.procesar(pedido, async () => {
      const rechazado = await this.cocina.rechazar(pedido);

      if (rechazado) {
        await this.avisar(
          'Pedido rechazado. Se le avisó al cliente.',
          'success'
        );
      } else {
        void this._vibracion.errorValidacion();

        await this.avisar(
          'Este pedido ya no se puede rechazar.',
          'warning'
        );
      }
    });
  }

  devolver(pedido: PedidoCocina): Promise<void> {
    return this.procesar(pedido, async () => {
      const devuelto = await this.cocina.devolver(pedido);

      if (devuelto) {
        await this.avisar(
          'El pedido volvió a "Por recibir".',
          'success'
        );
      } else {
        void this._vibracion.errorValidacion();

        await this.avisar(
          'Este pedido ya no se puede devolver.',
          'warning'
        );
      }
    });
  }

  private async procesar(
    pedido: PedidoCocina,
    accion: () => Promise<void>
  ): Promise<void> {
    this.procesando.set(pedido.idPedido);

    try {
      await accion();
    } catch (error) {
      void this._vibracion.error();

      await this.avisar(
        error instanceof Error
          ? error.message
          : 'No pudimos completar la acción.',
        'danger'
      );
    } finally {
      this.procesando.set(null);
    }
  }

  cambiarVista(vista: VistaCocina): void {
    if (vista === this.vista()) return;

    this.vista.set(vista);

    this.indiceMesaActual.set(0);
    this.indicePedidoActual.set(0);

    const viewport = this._viewport()?.nativeElement;

    if (viewport) {
      viewport.scrollLeft = 0;
    }
  }

  // Cambiar de mesa con las flechas.
  irAMesa(indice: number): void {
    const mesas = this.mesas();

    if (indice < 0 || indice >= mesas.length) return;

    const viewport = this._viewport()?.nativeElement;

    if (!viewport) return;

    const slides = viewport.querySelectorAll<HTMLElement>('.mesa-slide');
    const slide = slides[indice];

    if (!slide) return;

    this.indiceMesaActual.set(indice);
    this.indicePedidoActual.set(0);

    viewport.scrollTo({
      left:
        slide.offsetLeft -
        (viewport.clientWidth - slide.offsetWidth) / 2,
      behavior: 'smooth',
    });

    // Al seleccionar otra mesa, empezamos por su primer pedido.
    const pedidosViewport =
      slide.querySelector<HTMLElement>('.mesa-pedidos');

    pedidosViewport?.scrollTo({
      top: 0,
      behavior: 'instant',
    });
  }

  // Detectar la mesa centrada al deslizar horizontalmente.
  alDesplazarMesas(): void {
    const viewport = this._viewport()?.nativeElement;

    if (!viewport) return;

    const centroViewport =
      viewport.getBoundingClientRect().left +
      viewport.clientWidth / 2;

    const slides = Array.from(
      viewport.querySelectorAll<HTMLElement>('.mesa-slide')
    );

    let masCercano = 0;
    let distanciaMinima = Infinity;

    slides.forEach((slide, indice) => {
      const rect = slide.getBoundingClientRect();
      const centroSlide = rect.left + rect.width / 2;
      const distancia = Math.abs(centroSlide - centroViewport);

      if (distancia < distanciaMinima) {
        distanciaMinima = distancia;
        masCercano = indice;
      }
    });

    if (masCercano !== this.indiceMesaActual()) {
      this.indiceMesaActual.set(masCercano);
      this.indicePedidoActual.set(0);

      // Restablecemos el scroll vertical de la nueva mesa.
      const pedidosViewport =
        slides[masCercano]?.querySelector<HTMLElement>('.mesa-pedidos');

      if (pedidosViewport) {
        pedidosViewport.scrollTop = 0;
      }
    }
  }

  // Detectar el pedido visible al deslizar verticalmente.
  alDesplazarPedidos(
    event: Event,
    indiceMesa: number
  ): void {
    if (indiceMesa !== this.indiceMesaActual()) return;

    const viewport = event.currentTarget as HTMLElement;

    const slides = Array.from(
      viewport.querySelectorAll<HTMLElement>('.pedido-slide')
    );

    const centroViewport =
      viewport.getBoundingClientRect().top +
      viewport.clientHeight / 2;

    let masCercano = 0;
    let distanciaMinima = Infinity;

    slides.forEach((slide, indice) => {
      const rect = slide.getBoundingClientRect();
      const centroSlide = rect.top + rect.height / 2;
      const distancia = Math.abs(centroSlide - centroViewport);

      if (distancia < distanciaMinima) {
        distanciaMinima = distancia;
        masCercano = indice;
      }
    });

    this.indicePedidoActual.set(masCercano);
  }

  volver(): void {
    void this._router.navigate(['/admin']);
  }

  async cerrarSesion(): Promise<void> {
    await this._auth.logout();

    localStorage.removeItem('mesa');

    void this._router.navigate(['/login']);
  }

  private async iniciar(): Promise<void> {
    try {
      await this.cocina.iniciar();
    } catch (error) {
      void this._vibracion.error();

      await this.avisar(
        error instanceof Error
          ? error.message
          : 'No pudimos cargar los pedidos.',
        'danger'
      );
    }
  }

  private async avisar(
    mensaje: string,
    color: 'success' | 'warning' | 'danger'
  ): Promise<void> {
    const toast = await this._toastController.create({
      message: mensaje,
      duration: color === 'danger' ? 5000 : 3000,
      position: 'top',
      color,
    });

    await toast.present();
  }
}
