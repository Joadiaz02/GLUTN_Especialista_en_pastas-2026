import {
  Component,
  inject,
  signal,
} from '@angular/core';

import {
  CommonModule,
  CurrencyPipe,
} from '@angular/common';

import { Router } from '@angular/router';

import { Carrito } from '@app/pages/carrito/carrito';

import {
  PedidoSheetService,
} from '@app/services/pedido-sheet/pedido-sheet';

import { ListaFilasDirective } from '@app/directives/lista-filas/lista-filas.directive';

@Component({
  selector: 'app-pedido-sheet',

  standalone: true,

  imports: [
    CommonModule,
    CurrencyPipe,
    ListaFilasDirective,
  ],

  templateUrl:
    './pedido-sheet.component.html',

  styleUrl:
    './pedido-sheet.component.scss',
})
export class PedidoSheetComponent {

  carrito =
    inject(Carrito);

  sheet =
    inject(PedidoSheetService);

  private router =
    inject(Router);

  /*
   * ==========================================
   * ESTADO DEL CIERRE
   * ==========================================
   */

  cerrando =
    signal(false);

  desplazamientoY =
    signal(0);

  animacionCierre =
    signal(false);

  private inicioY = 0;

  /*
   * Si el dedo empezó sobre la lista de productos y esta ya está scrolleada,
   * el gesto es para scrollear la lista: el panel no se arrastra.
   */
  private puedeArrastrar = true;

  private readonly UMBRAL_CIERRE = 90;

  private readonly DURACION_CIERRE = 280;


  /*
   * ==========================================
   * CERRAR NORMAL
   * ==========================================
   */

  cerrar(): void {

    if (this.cerrando()) {
      return;
    }

    this.iniciarCierre();
  }


  /*
   * ==========================================
   * ANIMACIÓN DE CIERRE
   * ==========================================
   */

  private iniciarCierre(): void {

    this.cerrando.set(true);

    this.animacionCierre.set(true);

    /*
     * La transición CSS hace que el sheet
     * termine de salir hacia abajo.
     */
    this.desplazamientoY.set(
      window.innerHeight
    );

    /*
     * Esperamos exactamente la duración
     * de la animación antes de ocultarlo.
     */
    setTimeout(() => {

      this.sheet.cerrar();

      /*
       * Volvemos a dejar todo preparado
       * para la próxima apertura.
       */
      this.desplazamientoY.set(0);

      this.animacionCierre.set(false);

      this.cerrando.set(false);

    }, this.DURACION_CIERRE);
  }


  /*
   * ==========================================
   * AUMENTAR
   * ==========================================
   */

  aumentar(
    idProducto: string
  ): void {

    const item =
      this.carrito
        .items()
        .find(
          item =>
            item.producto.id_carta ===
            idProducto
        );

    if (!item) {
      return;
    }

    this.carrito.agregar(
      item.producto
    );
  }


  /*
   * ==========================================
   * DISMINUIR
   * ==========================================
   */

  disminuir(
    idProducto: string
  ): void {

    this.carrito.quitar(
      idProducto
    );
  }


  /*
   * ==========================================
   * ELIMINAR
   * ==========================================
   */

  eliminar(
    idProducto: string
  ): void {

    this.carrito.eliminar(
      idProducto
    );
  }


  /*
   * ==========================================
   * CONTINUAR
   * ==========================================
   */

  continuarPedido(): void {

    /*
     * Acá sí hacemos el cierre animado
     * antes de navegar.
     */
    this.iniciarCierre();

    setTimeout(() => {

      void this.router.navigate([
        '/pedido'
      ]);

    }, this.DURACION_CIERRE);
  }


  /*
   * ==========================================
   * TOUCH START
   * ==========================================
   */

  touchStart(
    evento: TouchEvent
  ): void {

    if (this.cerrando()) {
      return;
    }

    this.inicioY =
      evento.touches[0]?.clientY ?? 0;

    /*
     * ¿El dedo empezó sobre la lista de productos?
     * Si la lista no está arriba de todo, el gesto
     * es para scrollearla y no para arrastrar el panel.
     */
    const lista =
      (evento.target as HTMLElement | null)
        ?.closest('.pedido-items') as HTMLElement | null;

    this.puedeArrastrar =
      !lista || lista.scrollTop <= 0;

    this.desplazamientoY.set(0);

    /*
     * Durante el arrastre NO queremos
     * transición CSS.
     */
    this.animacionCierre.set(false);
  }


  /*
   * ==========================================
   * TOUCH MOVE
   * ==========================================
   */

  touchMove(
    evento: TouchEvent
  ): void {

    if (
      this.cerrando() ||
      !this.puedeArrastrar
    ) {
      return;
    }

    const actualY =
      evento.touches[0]?.clientY ?? 0;

    const delta =
      actualY - this.inicioY;

    /*
     * Solamente permitimos arrastrar
     * hacia abajo.
     */
    if (delta <= 0) {

      this.desplazamientoY.set(0);

      return;
    }

    /*
     * Quitamos la resistencia a partir
     * de cierto punto para que se sienta
     * natural.
     */
    const desplazamiento =
      delta > 180
        ? 180 +
          (
            delta - 180
          ) * 0.35
        : delta;

    this.desplazamientoY.set(
      desplazamiento
    );
  }


  /*
   * ==========================================
   * TOUCH END
   * ==========================================
   */

  touchEnd(
    evento: TouchEvent
  ): void {

    if (
      this.cerrando() ||
      !this.puedeArrastrar
    ) {
      return;
    }

    const finY =
      evento.changedTouches[0]?.clientY ?? 0;

    const delta =
      finY - this.inicioY;

    /*
     * Superó el umbral:
     * cerramos con animación.
     */
    if (
      delta >=
      this.UMBRAL_CIERRE
    ) {

      this.iniciarCierre();

      return;
    }

    /*
     * No llegó al umbral:
     * vuelve suavemente arriba.
     */
    this.animacionCierre.set(true);

    this.desplazamientoY.set(0);
  }
}