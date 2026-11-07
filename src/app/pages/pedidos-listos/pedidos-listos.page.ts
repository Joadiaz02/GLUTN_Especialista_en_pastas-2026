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
import { IonContent, ToastController, IonButton } from '@ionic/angular';
import { Router } from '@angular/router';
import { ListaFilasDirective } from '@app/directives/lista-filas/lista-filas.directive';
import {
  Auth,
  EstadoParte,
  PedidoDelMozo,
  PedidosListos,
  SectorPedido,
  Vibracion,
} from '@app/services';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { HeaderComponent } from '@app/components/ui/header/header.component';
import { Pedido } from '@app/services/pedido/pedido';

const NOMBRE_SECTOR: Record<SectorPedido, string> = {
  cocina: 'Cocina',
  bar: 'Bar',
};

const NOMBRE_ESTADO: Record<EstadoParte, string> = {
  por_recibir: 'Por recibir',
  en_preparacion: 'En preparación',
  listo: 'Listo',
};

export type VistaMozo = 'listos' | 'en_preparacion';

interface SlidePedidoMozo extends PedidoDelMozo {
  numeroMesa: string;
  numeroEnMesa: number;
  totalEnMesa: number;
}

interface GrupoMesaMozo {
  numeroMesa: string;
  pedidos: SlidePedidoMozo[];
}

@Component({
  selector: 'app-pedidos-listos',
  standalone: true,
  templateUrl: './pedidos-listos.page.html',
  styleUrls: ['../cocina/cocina.page.scss', './pedidos-listos.page.scss'],
  imports: [
    HeaderComponent,
    DatePipe,
    IonContent,
    SpinnerLogoComponent,
    IonButton,
    ListaFilasDirective,
  ],
})
export class PedidosListosPage implements OnDestroy {
  pedidosListos = inject(PedidosListos);

  private _auth = inject(Auth);
  private _vibracion = inject(Vibracion);
  private _toastController = inject(ToastController);
  private _router = inject(Router);
  private _pedido = inject(Pedido);

  procesando = signal<string | null>(null);

  private _viewport = viewChild<ElementRef<HTMLElement>>('viewport');

  indiceMesaActual = signal(0);
  indicePedidoActual = signal(0);

  vista = signal<VistaMozo>('listos');

  pedidos = computed<PedidoDelMozo[]>(() =>
    this.vista() === 'listos'
      ? this.pedidosListos.completos()
      : this.pedidosListos.enPreparacion()
  );

  // Agrupa los pedidos de la vista seleccionada por mesa.
  mesas = computed<GrupoMesaMozo[]>(() => {
    const grupos = new Map<string, PedidoDelMozo[]>();

    for (const pedido of this.pedidos()) {
      const numeroMesa = String(pedido.numeroMesa);
      const existentes = grupos.get(numeroMesa) ?? [];

      existentes.push(pedido);
      grupos.set(numeroMesa, existentes);
    }

    return Array.from(grupos.entries()).map(([numeroMesa, pedidos]) => ({
      numeroMesa,
      pedidos: pedidos.map((pedido, indice) => ({
        ...pedido,
        numeroMesa,
        numeroEnMesa: indice + 1,
        totalEnMesa: pedidos.length,
      })),
    }));
  });

  constructor() {
    // Mantiene los índices dentro de los límites cuando cambian los pedidos.
    effect(() => {
      const ultimaMesa = Math.max(0, this.mesas().length - 1);

      if (this.indiceMesaActual() > ultimaMesa) {
        this.indiceMesaActual.set(ultimaMesa);
      }

      const pedidosMesa = this.mesas()[this.indiceMesaActual()]?.pedidos ?? [];
      const ultimoPedido = Math.max(0, pedidosMesa.length - 1);

      if (this.indicePedidoActual() > ultimoPedido) {
        this.indicePedidoActual.set(ultimoPedido);
      }
    });
  }

  ionViewWillEnter(): void {
    void this.iniciar();
  }

  ngOnDestroy(): void {
    this.pedidosListos.detener();
  }

  nombreSector(sector: SectorPedido): string {
    return NOMBRE_SECTOR[sector];
  }

  nombreEstado(estado: EstadoParte): string {
    return NOMBRE_ESTADO[estado];
  }

  cambiarVista(vista: VistaMozo): void {
    if (vista === this.vista()) {
      return;
    }

    this.vista.set(vista);
    this.indiceMesaActual.set(0);
    this.indicePedidoActual.set(0);

    const viewport = this._viewport()?.nativeElement;

    if (viewport) {
      viewport.scrollTo({
        left: 0,
        top: 0,
        behavior: 'instant',
      });
    }
  }

  // Navega horizontalmente entre mesas.
  irAMesa(indice: number): void {
    const viewport = this._viewport()?.nativeElement;
    const slide = viewport?.querySelectorAll<HTMLElement>('.mesa-slide')[indice];

    if (!viewport || !slide) {
      return;
    }

    this.indiceMesaActual.set(indice);
    this.indicePedidoActual.set(0);

    viewport.scrollTo({
      left: slide.offsetLeft - (viewport.clientWidth - slide.offsetWidth) / 2,
      behavior: 'smooth',
    });
  }

  // Detecta la mesa más cercana al centro del carrusel horizontal.
  alDesplazarMesas(): void {
    const viewport = this._viewport()?.nativeElement;

    if (!viewport) {
      return;
    }

    const centro = viewport.scrollLeft + viewport.clientWidth / 2;
    const slides = Array.from(
      viewport.querySelectorAll<HTMLElement>('.mesa-slide')
    );

    let masCercano = 0;
    let distanciaMinima = Number.POSITIVE_INFINITY;

    slides.forEach((slide, indice) => {
      const distancia = Math.abs(
        slide.offsetLeft + slide.offsetWidth / 2 - centro
      );

      if (distancia < distanciaMinima) {
        distanciaMinima = distancia;
        masCercano = indice;
      }
    });

    if (masCercano !== this.indiceMesaActual()) {
      this.indiceMesaActual.set(masCercano);
      this.indicePedidoActual.set(0);
    }
  }

  // Detecta el pedido más cercano al centro del carrusel vertical.
  alDesplazarPedidos(): void {
    const viewport = this._viewport()?.nativeElement;
    const mesaActual = viewport?.querySelectorAll<HTMLElement>('.mesa-slide')[
      this.indiceMesaActual()
    ];

    const lista = mesaActual?.querySelector<HTMLElement>('.mesa-pedidos');

    if (!lista) {
      return;
    }

    const centro = lista.scrollTop + lista.clientHeight / 2;
    const slides = Array.from(
      lista.querySelectorAll<HTMLElement>('.pedido-slide')
    );

    let masCercano = 0;
    let distanciaMinima = Number.POSITIVE_INFINITY;

    slides.forEach((slide, indice) => {
      const distancia = Math.abs(
        slide.offsetTop + slide.offsetHeight / 2 - centro
      );

      if (distancia < distanciaMinima) {
        distanciaMinima = distancia;
        masCercano = indice;
      }
    });

    if (masCercano !== this.indicePedidoActual()) {
      this.indicePedidoActual.set(masCercano);
    }
  }

  volver(): void {
    void this._router.navigate(['/admin']);
  }

  async cerrarSesion(): Promise<void> {
    await this._auth.logout();
    void this._router.navigate(['/login']);
  }

  private async iniciar(): Promise<void> {
    try {
      await this.pedidosListos.iniciar();
    } catch (error) {
      void this._vibracion.error();

      const toast = await this._toastController.create({
        message:
          error instanceof Error
            ? error.message
            : 'No pudimos cargar los pedidos listos.',
        duration: 5000,
        position: 'top',
        color: 'danger',
      });

      await toast.present();
    }
  }

  // Entrega el pedido al cliente.
  async entregar(pedido: PedidoDelMozo): Promise<void> {
    this.procesando.set(pedido.idPedido);

    try {
      await this._pedido.actualizarEstado(
        pedido.idPedido,
        pedido.idUsuario,
        'entregado'
      );
    } catch (error) {
      void this._vibracion.error();

      await this.avisar(
        error instanceof Error
          ? error.message
          : 'No pudimos entregar el pedido.',
        'danger'
      );
    } finally {
      this.procesando.set(null);
    }
  }

  private async avisar(
    mensaje: string,
    color: 'success' | 'danger'
  ): Promise<void> {
    const toast = await this._toastController.create({
      message: mensaje,
      duration: 3000,
      position: 'top',
      color,
    });

    await toast.present();
  }
}