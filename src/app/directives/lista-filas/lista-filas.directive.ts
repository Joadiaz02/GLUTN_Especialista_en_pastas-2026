import { AfterViewInit, Directive, ElementRef, NgZone, OnDestroy, inject } from '@angular/core';

/**
 * Lista con scroll que nunca deja una fila cortada, ni arriba ni abajo.
 *
 * Uso (el contenedor de la lista va dentro de un wrapper):
 *
 *   <div class="pedido__items-wrap">
 *     <ul class="pedido__items" appListaFilas> ...filas... </ul>
 *   </div>
 *
 * Cómo funciona:
 *  - Mide el alto real que tiene la lista y calcula cuántas filas completas
 *    entran (usando --fila-min como alto mínimo de fila y el gap del CSS).
 *  - Reparte ese alto entre las filas visibles (--fila-alto), así todas miden
 *    lo mismo y cada una es un punto de reposo del scroll.
 *  - Si todas las filas entran, no hay scroll y las filas quedan en su alto mínimo.
 *  - Marca el wrapper con "tiene-arriba" / "tiene-abajo" cuando hay más filas
 *    para ver (el SCSS dibuja una línea de aviso).
 *
 * Se recalcula solo al cambiar el tamaño (rotación, teclado, letra del sistema)
 * o la cantidad de filas.
 */
@Directive({
  selector: '[appListaFilas]',
  standalone: true,
})
export class ListaFilasDirective implements AfterViewInit, OnDestroy {
  private readonly lista = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly zona = inject(NgZone);

  private resize?: ResizeObserver;
  private mutacion?: MutationObserver;
  private frame = 0;

  private readonly alDesplazar = () => this.actualizarAvisos();

  ngAfterViewInit(): void {
    // todo fuera de la zona de Angular: no hace falta detección de cambios
    this.zona.runOutsideAngular(() => {
      this.lista.addEventListener('scroll', this.alDesplazar, { passive: true });

      if (typeof ResizeObserver !== 'undefined') {
        this.resize = new ResizeObserver(() => this.programar());
        this.resize.observe(this.lista);
      }

      this.mutacion = new MutationObserver(() => this.programar());
      this.mutacion.observe(this.lista, { childList: true });

      void document.fonts?.ready.then(() => this.programar());
      this.programar();
    });
  }

  ngOnDestroy(): void {
    this.lista.removeEventListener('scroll', this.alDesplazar);
    this.resize?.disconnect();
    this.mutacion?.disconnect();
    cancelAnimationFrame(this.frame);
  }

  private programar(): void {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.ajustar());
  }

  private ajustar(): void {
    const total = this.lista.children.length;
    const estilo = getComputedStyle(this.lista);

    const minimo = parseFloat(estilo.getPropertyValue('--fila-min')) || 48;
    const gap = parseFloat(estilo.rowGap) || 0;
    const alto = this.lista.clientHeight;

    if (alto <= 0 || total === 0) {
      this.actualizarAvisos();
      return;
    }

    // cuántas filas completas entran en el alto disponible
    const entran = Math.max(1, Math.floor((alto + gap) / (minimo + gap)));

    if (total <= entran) {
      // todo entra: sin scroll, filas en su alto mínimo
      this.lista.style.setProperty('--fila-alto', `${minimo}px`);
    } else {
      // filas del mismo alto que llenan justo el espacio: cada una es un punto de reposo
      const fila = Math.floor((alto - (entran - 1) * gap) / entran);
      this.lista.style.setProperty('--fila-alto', `${Math.max(minimo, fila)}px`);
    }

    this.actualizarAvisos();
  }

  private actualizarAvisos(): void {
    const contenedor = this.lista.parentElement;
    if (!contenedor) return;

    const hayArriba = this.lista.scrollTop > 1;
    const hayAbajo = this.lista.scrollTop + this.lista.clientHeight < this.lista.scrollHeight - 1;

    contenedor.classList.toggle('tiene-arriba', hayArriba);
    contenedor.classList.toggle('tiene-abajo', hayAbajo);
  }
}