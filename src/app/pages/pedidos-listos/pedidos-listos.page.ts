import {
  Component,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { IonContent, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';

import { Auth, ItemListo, PedidosListos, Vibracion } from '@app/services';
import type { TipoCarta } from '@app/models/carta.model';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { HeaderComponent } from '@app/components/ui/header/header.component';

const NOMBRE_TIPO: Record<TipoCarta, string> = {
  plato: 'Platos',
  bebida: 'Bebidas',
  postre: 'Postres',
};

// Punto 18: pedidos completos para llevar a la mesa, de a uno por tarjeta
// y ordenados por mesa (mismo carrusel que Cocina).
@Component({
  selector: 'app-pedidos-listos',
  standalone: true,
  templateUrl: './pedidos-listos.page.html',
  styleUrls: ['../cocina/cocina.page.scss', './pedidos-listos.page.scss'],
  imports: [HeaderComponent, DatePipe, IonContent, SpinnerLogoComponent],
})
export class PedidosListosPage implements OnDestroy {
  pedidosListos = inject(PedidosListos);

  private _auth = inject(Auth);
  private _vibracion = inject(Vibracion);
  private _toastController = inject(ToastController);
  private _router = inject(Router);

  private _viewport = viewChild<ElementRef<HTMLElement>>('viewport');

  indiceActual = signal(0);

  constructor() {
    // Cuando se entrega el último pedido de la lista, el contador no puede
    // quedar apuntando a una tarjeta que ya no existe.
    effect(() => {
      const ultimo = Math.max(0, this.pedidosListos.pedidos().length - 1);

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
    this.pedidosListos.detener();
  }

  // Ítems agrupados por tipo, en el orden en que vienen (platos, bebidas,
  // postres).
  gruposDe(items: ItemListo[]): { titulo: string; items: ItemListo[] }[] {
    const grupos: { titulo: string; items: ItemListo[] }[] = [];

    for (const item of items) {
      const titulo = NOMBRE_TIPO[item.tipo] ?? 'Otros';
      const grupo = grupos.find((g) => g.titulo === titulo);

      if (grupo) {
        grupo.items.push(item);
      } else {
        grupos.push({ titulo, items: [item] });
      }
    }

    return grupos;
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
}
