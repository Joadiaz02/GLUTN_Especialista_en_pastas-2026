import {
  AfterViewInit,
  Directive,
  ElementRef,
  NgZone,
  OnDestroy,
  inject,
} from '@angular/core';

/**
 * Pone límites a una lista con scroll para que nunca quede una fila cortada.
 *
 * - Calcula cuántas filas completas entran en el alto visible de la lista.
 * - Les da a todas el mismo alto (--fila-alto), de modo que el alto visible
 *   sea exactamente un múltiplo del alto de una fila.
 * - Con "scroll-snap" en el CSS, el scroll solo frena al inicio de una fila.
 * - Marca el contenedor con "tiene-arriba" y "tiene-abajo" para mostrar
 *   una línea que avisa que hay más filas hacia ese lado.
 *
 * Uso: <ul appLimitesLista> dentro de un contenedor propio.
 * El CSS de la lista tiene que definir --fila-min (alto mínimo de una fila)
 * y dar a cada hijo "height: var(--fila-alto)".
 */
@Directive({
  selector: '[appLimitesLista]',
  standalone: true,
})
export class LimitesListaDirective implements AfterViewInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);

  private resizeObserver?: ResizeObserver;
  private mutationObserver?: MutationObserver;
  private frame = 0;

  private readonly programar = (): void => {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.ajustar());
  };

  private readonly alDesplazar = (): void => this.marcarLimites();

  ngAfterViewInit(): void {
    const lista = this.el.nativeElement;

    // todo corre fuera de Angular: solo toca estilos y clases, no datos
    this.zone.runOutsideAngular(() => {
      lista.addEventListener('scroll', this.alDesplazar, { passive: true });

      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(this.programar);
        this.resizeObserver.observe(lista);
      }

      // cuando se agregan o sacan filas hay que volver a marcar los límites
      this.mutationObserver = new MutationObserver(this.programar);
      this.mutationObserver.observe(lista, { childList: true });

      this.programar();
    });
  }

  ngOnDestroy(): void {
    this.el.nativeElement.removeEventListener('scroll', this.alDesplazar);
    this.resizeObserver?.disconnect();
    this.mutationObserver?.disconnect();
    cancelAnimationFrame(this.frame);
  }

  private ajustar(): void {
    const lista = this.el.nativeElement;
    const estilo = getComputedStyle(lista);

    const relleno =
      (parseFloat(estilo.paddingTop) || 0) +
      (parseFloat(estilo.paddingBottom) || 0);

    const alto = lista.clientHeight - relleno;

    // todavía no se ve (pantalla oculta): se vuelve a medir cuando aparezca
    if (alto <= 0) {
      return;
    }

    const separacion = parseFloat(estilo.rowGap) || 0;
    const minimo = parseFloat(estilo.getPropertyValue('--fila-min')) || 64;

    const filas = Math.max(
      1,
      Math.floor((alto + separacion) / (minimo + separacion)),
    );

    const altoFila = (alto - separacion * (filas - 1)) / filas;

    lista.style.setProperty('--fila-alto', `${altoFila}px`);

    this.marcarLimites();
  }

  private marcarLimites(): void {
    const lista = this.el.nativeElement;
    const contenedor = lista.parentElement;

    if (!contenedor) {
      return;
    }

    const hayArriba = lista.scrollTop > 2;
    const hayAbajo =
      lista.scrollTop + lista.clientHeight < lista.scrollHeight - 2;

    contenedor.classList.toggle('tiene-arriba', hayArriba);
    contenedor.classList.toggle('tiene-abajo', hayAbajo);
  }
}