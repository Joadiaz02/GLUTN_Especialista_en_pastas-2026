import {
  AfterViewInit,
  Directive,
  ElementRef,
  inject,
  Input,
  NgZone,
  OnDestroy,
} from '@angular/core';

/**
 * Hace que una lista con scroll vertical muestre siempre filas COMPLETAS
 * y sin espacio vacío:
 *  - si no entran todas: muestra una cantidad entera de filas, repartiendo
 *    el sobrante entre ellas; arriba de todo no se corta la de abajo y
 *    abajo de todo no se corta la de arriba
 *  - si entran todas: estira las filas (hasta un máximo) para llenar el alto
 *
 * Uso: se pone en el contenedor que scrollea (por ejemplo un <ul>).
 * El contenedor tiene que ocupar el espacio libre (flex: 1 1 auto;
 * min-height: 0; overflow-y: auto) y tener un `gap` entre filas.
 * La directiva agrega la clase `lista-encajada` y la variable CSS
 * `--alto-fila`, que el scss de la página usa para fijar el alto de cada fila.
 *
 * Se recalcula sola al cambiar el tamaño de pantalla, al rotar el celular
 * y al agregarse o quitarse filas.
 */
@Directive({
  selector: '[appListaEncajada]',
  standalone: true,
})
export class ListaEncajadaDirective implements AfterViewInit, OnDestroy {
  /** Ancestro cuyo tamaño dispara el recálculo (por defecto, la pantalla). */
  @Input() raizObservada = 'ion-content';

  /** Cuánto pueden estirarse las filas cuando entran todas (1.6 = hasta 60% más). */
  @Input() estiramientoMaximo = 1.6;

  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private zone = inject(NgZone);

  private resizeObserver?: ResizeObserver;
  private mutationObserver?: MutationObserver;
  private frame = 0;
  private destruida = false;

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      const lista = this.el.nativeElement;
      const raiz = lista.closest(this.raizObservada) ?? document.body;

      this.resizeObserver = new ResizeObserver(() => this.programar());
      this.resizeObserver.observe(raiz);

      // filas que se agregan o se quitan
      this.mutationObserver = new MutationObserver(() => this.programar());
      this.mutationObserver.observe(lista, { childList: true });

      window.addEventListener('resize', this.alCambiar);

      // cuando carga la tipografía cambian los tamaños del texto
      void document.fonts?.ready.then(() => this.programar());

      this.programar();
    });
  }

  ngOnDestroy(): void {
    this.destruida = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver?.disconnect();
    this.mutationObserver?.disconnect();
    window.removeEventListener('resize', this.alCambiar);
  }

  private alCambiar = (): void => this.programar();

  private programar(): void {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      if (!this.destruida) {
        this.ajustar();
      }
    });
  }

  private ajustar(): void {
    const lista = this.el.nativeElement;

    // se parte de la medida natural, sin alto fijo
    lista.classList.remove('lista-encajada');
    lista.style.removeProperty('--alto-fila');

    const filas = Array.from(lista.children) as HTMLElement[];

    if (filas.length === 0) {
      return;
    }

    // alto que tiene la lista: el espacio libre de la pantalla
    const disponible = lista.clientHeight;
    const gap = parseFloat(getComputedStyle(lista).rowGap) || 0;
    const maxNatural = Math.max(...filas.map((fila) => fila.offsetHeight));
    const desborda = lista.scrollHeight > disponible + 1;

    let alto: number;

    if (desborda) {
      // cuántas filas enteras entran; el sobrante se reparte entre ellas
      const cantidad = Math.min(
        Math.max(Math.floor((disponible + gap) / (maxNatural + gap)), 1),
        filas.length
      );

      alto = (disponible - (cantidad - 1) * gap) / cantidad;
    } else {
      // entran todas: se estiran un poco para no dejar espacio vacío
      alto = (disponible - (filas.length - 1) * gap) / filas.length;
      alto = Math.min(alto, maxNatural * this.estiramientoMaximo);
    }

    // nunca más chicas que su contenido
    alto = Math.max(alto, maxNatural);

    lista.style.setProperty('--alto-fila', `${alto}px`);
    lista.classList.add('lista-encajada');
  }
}