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

import { Auth, Cocina, Confirm, PedidoCocina, Vibracion } from '@app/services';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { HeaderComponent } from '@app/components/ui/header/header.component';
import { addIcons } from 'ionicons';
import { closeCircleOutline } from 'ionicons/icons';

// Puntos 16 y 18: pedidos pendientes de la cocina, de a uno por tarjeta
// y ordenados por mesa. Arriba se elige qué ver: los que faltan recibir o
// los que el cocinero ya tomó y tiene que entregar.
export type VistaCocina = 'por_recibir' | 'en_preparacion';

export interface SlideCocina extends PedidoCocina {
  numeroMesa: string;
  numeroEnMesa: number;
  totalEnMesa: number;
}

@Component({
  selector: 'app-cocina',
  standalone: true,
  templateUrl: './cocina.page.html',
  styleUrls: ['./cocina.page.scss'],
  imports: [HeaderComponent, DatePipe, IonButton, IonContent, SpinnerLogoComponent],
})
export class CocinaPage implements OnDestroy {
  cocina = inject(Cocina);

  private _auth = inject(Auth);
  private _vibracion = inject(Vibracion);
  private _confirm = inject(Confirm);
  private _toastController = inject(ToastController);
  private _router = inject(Router);

  private _viewport = viewChild<ElementRef<HTMLElement>>('viewport');

  // Pedido con una acción en curso (recibir, entregar, rechazar o devolver).
  procesando = signal<string | null>(null);

  indiceActual = signal(0);

  vista = signal<VistaCocina>('por_recibir');

  private _todos = computed(() =>
    this.cocina.mesas().flatMap((mesa) =>
      mesa.pedidos.map((pedido) => ({ ...pedido, numeroMesa: mesa.numeroMesa }))
    )
  );

  cantidadPorRecibir = computed(
    () => this._todos().filter((p) => !p.estadoCocina).length
  );

  cantidadEnPreparacion = computed(
    () => this._todos().filter((p) => p.estadoCocina).length
  );

  // Los de la vista elegida, numerados dentro de su mesa.
  pedidos = computed<SlideCocina[]>(() => {
    const porRecibir = this.vista() === 'por_recibir';
    const lista = this._todos().filter((p) => !p.estadoCocina === porRecibir);

    const totalPorMesa = new Map<string, number>();
    for (const p of lista) {
      totalPorMesa.set(p.numeroMesa, (totalPorMesa.get(p.numeroMesa) ?? 0) + 1);
    }

    const vistosPorMesa = new Map<string, number>();

    return lista.map((p) => {
      const numero = (vistosPorMesa.get(p.numeroMesa) ?? 0) + 1;
      vistosPorMesa.set(p.numeroMesa, numero);

      return { ...p, numeroEnMesa: numero, totalEnMesa: totalPorMesa.get(p.numeroMesa)! };
    });
  });

  constructor() {
    addIcons({ 'close-circle-outline': closeCircleOutline });

    // Al entregar el último pedido de la lista, el contador no puede
    // quedar apuntando a una tarjeta que ya no existe.
    effect(() => {
      const ultimo = Math.max(0, this.pedidos().length - 1);

      if (this.indiceActual() > ultimo) {
        this.indiceActual.set(ultimo);
      }
    });
  }

  // Ionic mantiene las páginas en pila: al volver se recarga el listado.
  ionViewWillEnter(): void {
    void this.iniciar();
  }

  ngOnDestroy(): void {
    this.cocina.detener();
  }

  recibir(pedido: PedidoCocina): Promise<void> {
    return this.procesar(pedido, async () => {
      const recibido = await this.cocina.recibir(pedido);

      if (recibido) {
        await this._vibracion.confirmacion();
        await this.avisar(
          'Pedido recibido. Lo tenés en "En preparación" y el cliente ya lo ve.',
          'success'
        );
      } else {
        void this._vibracion.errorValidacion();
        await this.avisar('Otro cocinero ya había recibido este pedido.', 'warning');
      }
    });
  }

  entregar(pedido: PedidoCocina): Promise<void> {
    return this.procesar(pedido, async () => {
      const completo = await this.cocina.entregar(pedido);

      await this._vibracion.confirmacion();
      await this.avisar(
        completo
          ? 'Pedido listo. Se les avisó a los mozos.'
          : 'Listo. Falta que el bar termine las bebidas para avisar al mozo.',
        'success'
      );
    });
  }

  // La cocina no puede prepararlo (ej. falta un ingrediente): vuelve al
  // cliente para que lo modifique.
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
        await this._vibracion.confirmacion();
        await this.avisar('Pedido rechazado. Se le avisó al cliente.', 'success');
      } else {
        void this._vibracion.errorValidacion();
        await this.avisar('Este pedido ya no se puede rechazar.', 'warning');
      }
    });
  }

  // Deshace "Recibir" por si se tocó por error.
  devolver(pedido: PedidoCocina): Promise<void> {
    return this.procesar(pedido, async () => {
      const devuelto = await this.cocina.devolver(pedido);

      if (devuelto) {
        await this._vibracion.confirmacion();
        await this.avisar('El pedido volvió a "Por recibir".', 'success');
      } else {
        void this._vibracion.errorValidacion();
        await this.avisar('Este pedido ya no se puede devolver.', 'warning');
      }
    });
  }

  private async procesar(pedido: PedidoCocina, accion: () => Promise<void>): Promise<void> {
    this.procesando.set(pedido.idPedido);

    try {
      await accion();
    } catch (error) {
      void this._vibracion.error();
      await this.avisar(
        error instanceof Error ? error.message : 'No pudimos completar la acción.',
        'danger'
      );
    } finally {
      this.procesando.set(null);
    }
  }

  cambiarVista(vista: VistaCocina): void {
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

  // La tarjeta activa es la que queda más cerca del centro.
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

    localStorage.removeItem('mesa');

    void this._router.navigate(['/login']);
  }

  private async iniciar(): Promise<void> {
    try {
      await this.cocina.iniciar();
    } catch (error) {
      void this._vibracion.error();
      await this.avisar(
        error instanceof Error ? error.message : 'No pudimos cargar los pedidos.',
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
