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

// pedidos pendientes del mozo, listos o en preparación
@Component({
  selector: 'app-pedidos-listos',
  standalone: true,
  templateUrl: './pedidos-listos.page.html',
  styleUrls: ['../cocina/cocina.page.scss', './pedidos-listos.page.scss'],
  imports: [HeaderComponent, DatePipe, IonContent, SpinnerLogoComponent, IonButton],
})
export class PedidosListosPage implements OnDestroy {
  pedidosListos = inject(PedidosListos);

  private _auth = inject(Auth);
  private _vibracion = inject(Vibracion);
  private _toastController = inject(ToastController);
  private _router = inject(Router);

//punto19
  private _pedido = inject(Pedido);
  procesando = signal<string | null>(null);

  private _viewport = viewChild<ElementRef<HTMLElement>>('viewport');

  indiceActual = signal(0);

  vista = signal<VistaMozo>('listos');

  pedidos = computed<PedidoDelMozo[]>(() =>
    this.vista() === 'listos'
      ? this.pedidosListos.completos()
      : this.pedidosListos.enPreparacion()
  );

  constructor() {
    // ajusta el contador cuando se va el último pedido
    effect(() => {
      const ultimo = Math.max(0, this.pedidos().length - 1);

      if (this.indiceActual() > ultimo) {
        this.indiceActual.set(ultimo);
      }
    });
  }

  // recarga el listado al volver a la pantalla
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
    this.indiceActual.set(0);

    const viewport = this._viewport()?.nativeElement;
    if (viewport) {
      viewport.scrollLeft = 0;
    }
  }

  irA(indice: number): void {
    const viewport = this._viewport()?.nativeElement;
    const slide = viewport?.querySelectorAll<HTMLElement>('.slide')[indice];

    if (!viewport || !slide) {
      return;
    }

    this.indiceActual.set(indice);

    viewport.scrollTo({
      left: slide.offsetLeft - (viewport.clientWidth - slide.offsetWidth) / 2,
      behavior: 'smooth',
    });
  }

  // la tarjeta activa es la más cercana al centro
  alDesplazar(): void {
    const viewport = this._viewport()?.nativeElement;

    if (!viewport) {
      return;
    }

    const centro = viewport.scrollLeft + viewport.clientWidth / 2;
    const slides = Array.from(viewport.querySelectorAll<HTMLElement>('.slide'));

    let masCercano = 0;
    let distanciaMinima = Number.POSITIVE_INFINITY;

    slides.forEach((slide, indice) => {
      const distancia = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - centro);

      if (distancia < distanciaMinima) {
        distanciaMinima = distancia;
        masCercano = indice;
      }
    });

    if (masCercano !== this.indiceActual()) {
      this.indiceActual.set(masCercano);
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
          error instanceof Error ? error.message : 'No pudimos cargar los pedidos listos.',
        duration: 5000,
        position: 'top',
        color: 'danger',
      });

      await toast.present();
    }
  }

  //entrega del pedido al usuario
  async entregar(pedido: PedidoDelMozo): Promise<void> {
  this.procesando.set(pedido.idPedido);

    try {
      await this._pedido.actualizarEstado(pedido.idPedido, pedido.idUsuario, 'entregado');
    } catch (error) {
      void this._vibracion.error();
      await this.avisar(
        error instanceof Error ? error.message : 'No pudimos entregar el pedido.',
        'danger'
      );
    } finally {
      this.procesando.set(null);
    }
  }

  private async avisar(mensaje: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this._toastController.create({
      message: mensaje,
      duration: 3000,
      position: 'top',
      color,
    });

    await toast.present();
  }
}
