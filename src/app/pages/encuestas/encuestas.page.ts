import {
  AfterViewChecked,
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonSpinner,
  IonRange,
  ToastController,
} from '@ionic/angular';
import { Subscription } from 'rxjs';
import { HeaderComponent } from '@app/components/ui/header/header.component';
import {
  EncuestasService, EstadoEncuesta, PreguntaEncuesta,
  ResultadoEncuesta, ResultadoTemporalEncuesta, TipoPregunta,
} from '@app/services/encuestas/encuestas.service';

@Component({
  selector: 'app-encuestas',
  standalone: true,
  imports: [
    IonButton,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonSpinner,
    IonRange,
    HeaderComponent,
    SpinnerLogoComponent
  ],
  templateUrl: './encuestas.page.html',
  styleUrl: './encuestas.page.scss',
})
export class EncuestasPage implements OnInit, AfterViewInit, AfterViewChecked, OnDestroy {
  private readonly encuestasService = inject(EncuestasService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastController = inject(ToastController);
  private readonly urlPrevia = (
  this.router.getCurrentNavigation()?.previousNavigation?.finalUrl?.toString() ?? ''
).split(/[?#]/)[0];
  @ViewChild(IonContent) private content?: IonContent;

  private routeSubscription?: Subscription;

  cargando = signal(true);
  enviando = signal(false);
  error = signal('');
  // antes: rutaVolver = signal('/home');
  private origenMenu = signal<'/home' | '/waiting-room'>('/home');

  rutaVolver = computed(() =>
    this.esPantallaGrafico() ? '/encuestas' : this.origenMenu(),
  );
  modoEncuesta = computed(
  () =>
    !this.cargando() &&
    !this.esPantallaGrafico() &&
    !this.estado().respondida &&
    this.estado().puede_responder &&
    this.tienePreguntas(),
);
  titulo = signal('Tu experiencia en GLUTN');
  descripcion = signal(
    'Tu opinión nos ayuda a mejorar la atención, los platos y el servicio.',
  );

  preguntas = signal<PreguntaEncuesta[]>([]);
  resultados = signal<ResultadoEncuesta[]>([]);
  resultadosTemporales = signal<ResultadoTemporalEncuesta[]>([]);

  estado = signal<EstadoEncuesta>({
    autenticado: false,
    puede_responder: false,
    respondida: false,
    recepcion_confirmada: false,
  });

  respuestas = signal<Record<string, string | string[]>>({});
  tipoGrafico = signal('');

  esPantallaGrafico = computed(() => this.tipoGrafico().length > 0);
  tienePreguntas = computed(() => this.preguntas().length > 0);
  pasoActual = signal(0);

  @ViewChild('scroller') private scroller?: ElementRef<HTMLElement>;
@ViewChild('finDesplazamiento') private finDesplazamiento?: ElementRef<HTMLElement>;

private resizeObserver?: ResizeObserver;
private ajusteFrame = 0;

ngAfterViewInit(): void {
  const el = this.scroller?.nativeElement;
  if (el && typeof ResizeObserver !== 'undefined') {
    this.resizeObserver = new ResizeObserver(() => this.programarAjuste());
    this.resizeObserver.observe(el);
  }
  void document.fonts?.ready.then(() => this.programarAjuste());
}

ngAfterViewChecked(): void {
  // Los bloques cambian al responder, al avanzar de paso o al aparecer errores.
  this.programarAjuste();
}

ngOnDestroy(): void {
  this.routeSubscription?.unsubscribe();
  this.resizeObserver?.disconnect();
  cancelAnimationFrame(this.ajusteFrame);
}

@HostListener('window:resize')
@HostListener('window:orientationchange')
onResize(): void {
  this.programarAjuste();
}


  preguntaActual = computed(
    () => this.preguntas()[this.pasoActual()] ?? null,
  );

  esUltimoPaso = computed(
    () => this.pasoActual() === this.preguntas().length - 1,
  );


  private programarAjuste(): void {
  cancelAnimationFrame(this.ajusteFrame);
  this.ajusteFrame = requestAnimationFrame(() => this.ajustarFinal());
}

private resolverOrigen(): '/home' | '/waiting-room' {
  const esValido = (v: unknown): v is '/home' | '/waiting-room' =>
    v === '/home' || v === '/waiting-room';

  // 1. Si quien navega manda el origen, se respeta.
  const deState = history.state?.origenEncuestas;
  if (esValido(deState)) return deState;

  // 2. Si no, se usa la página de la que venimos.
  if (this.urlPrevia.startsWith('/waiting-room')) return '/waiting-room';
  if (this.urlPrevia === '/home') return '/home';

  // 3. Si venimos de un gráfico (o se recargó la página), se usa lo guardado.
  if (this.urlPrevia === '' || this.urlPrevia.startsWith('/encuestas')) {
    try {
      const guardado = sessionStorage.getItem('origenEncuestas');
      if (esValido(guardado)) return guardado;
    } catch {}
  }

  return '/home';
}

/**
 * Hace que el último bloque pueda alinearse arriba de todo.
 * Publica el alto visible del scroller (--alto-visible): cada tarjeta de
 * resultados lo usa para ocupar exactamente una pantalla y para calcular
 * el tamaño de la torta.
 */
private ajustarFinal(): void {
  const scroller = this.scroller?.nativeElement;
  if (!scroller) return;

  scroller.style.setProperty('--alto-visible', `${scroller.clientHeight}px`);
}


private bloquesDeScroll(): HTMLElement[] {
  const scroller = this.scroller?.nativeElement;
  const fin = this.finDesplazamiento?.nativeElement;
  if (!scroller) return [];

  return (Array.from(scroller.children) as HTMLElement[]).filter(
    (el) => el !== fin,
  );
}


  avanzar(): void {
    const pregunta = this.preguntaActual();
    if (!pregunta) return;

    const valor = this.respuestas()[pregunta.id];

    const vacia =
      valor === undefined ||
      valor === null ||
      (typeof valor === 'string' && !valor.trim()) ||
      (Array.isArray(valor) && valor.length === 0);

    if (pregunta.obligatoria && vacia) {
      this.error.set(`Completá la pregunta: ${pregunta.texto}`);
      return;
    }

    this.error.set('');

    if (!this.esUltimoPaso()) {
      this.pasoActual.update((paso) => paso + 1);
      void this.desplazarArriba();
    }
  }

  retroceder(): void {
    this.error.set('');
    this.pasoActual.update((paso) => Math.max(0, paso - 1));
    void this.desplazarArriba();
  }

  colorOpcion(indice: number): string {
const colores = [
  '#3639fc', '#657a4d', '#7ad467', '#8b79a8', '#6b9bb8',
  '#b94f2d', '#e0a526', '#c94c7c', '#2f8f83', '#8a5a3c',
];

    return colores[indice % colores.length];
  }

  ngOnInit(): void {
    const origen = this.resolverOrigen();
    this.origenMenu.set(origen);

    try {
      sessionStorage.setItem('origenEncuestas', origen);
    } catch {}

    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      this.tipoGrafico.set(params.get('tipo') ?? '');
      void this.desplazarArriba();
      void this.cargar();
    });
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');

    try {
      const [estado, resultados, encuesta] = await Promise.all([
        this.encuestasService.obtenerEstado(),
        this.encuestasService.obtenerResultados(),
        this.encuestasService.obtenerEncuestaActiva(),
      ]);

      // La RPC temporal es opcional. Si todavía no está aplicada,
      // el resto de la encuesta sigue funcionando.
      try {
        this.resultadosTemporales.set(
          await this.encuestasService.obtenerResultadosTemporales(),
        );
      } catch {
        this.resultadosTemporales.set([]);
      }

      this.estado.set(estado);
      this.resultados.set(resultados);

      if (!encuesta) {
        this.titulo.set('Encuestas');
        this.descripcion.set(
          'En este momento no hay encuestas disponibles.',
        );
        this.preguntas.set([]);
        return;
      }

      this.titulo.set(encuesta.titulo);
      this.descripcion.set(encuesta.descripcion ?? '');

      const preguntas = await this.encuestasService.obtenerPreguntas(
        encuesta.id,
      );

      this.preguntas.set(preguntas);
    } catch (error: unknown) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'No pudimos cargar las encuestas. Intentá nuevamente.',
      );
    } finally {
      this.cargando.set(false);
      await Promise.resolve();
      await this.desplazarArriba();
    }
  }

  actualizarRespuesta(id: string, valor: string): void {
    this.respuestas.update((actuales) => ({
      ...actuales,
      [id]: valor,
    }));
  }

  actualizarMultiple(
    id: string,
    opcion: string,
    marcado: boolean,
  ): void {
    this.respuestas.update((actuales) => {
      const valorActual = actuales[id];
      const previas = Array.isArray(valorActual)
        ? valorActual
        : [];

      const nuevas = marcado
        ? [...new Set([...previas, opcion])]
        : previas.filter((valor) => valor !== opcion);

      return {
        ...actuales,
        [id]: nuevas,
      };
    });
  }

  estaSeleccionada(id: string, opcion: string): boolean {
    const valor = this.respuestas()[id];

    return Array.isArray(valor) && valor.includes(opcion);
  }

  async enviar(): Promise<void> {
    if (this.enviando()) return;

    if (!this.estado().puede_responder || this.estado().respondida) {
      this.error.set(
        this.estado().respondida
          ? 'Ya respondiste la encuesta durante esta estadía.'
          : 'Primero tenés que confirmar la recepción de tu pedido.',
      );
      return;
    }

    for (const pregunta of this.preguntas()) {
      const valor = this.respuestas()[pregunta.id];

      const vacia =
        valor === undefined ||
        valor === null ||
        (typeof valor === 'string' && !valor.trim()) ||
        (Array.isArray(valor) && valor.length === 0);

      if (pregunta.obligatoria && vacia) {
        this.error.set(`Completá la pregunta: ${pregunta.texto}`);
        return;
      }
    }

    this.enviando.set(true);
    this.error.set('');

    try {
      await this.encuestasService.enviarRespuestas(this.respuestas());

      this.estado.update((estado) => ({
        ...estado,
        puede_responder: false,
        respondida: true,
      }));

      await this.mostrarMensaje(
        '¡Gracias por compartir tu opinión!',
        'success',
      );

      this.respuestas.set({});
      await this.cargar();
    } catch (error: unknown) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'No pudimos guardar tus respuestas. Intentá nuevamente.',
      );

      await this.mostrarMensaje(this.error(), 'danger');
    } finally {
      this.enviando.set(false);
    }
  }

  cantidadTotal(resultado: ResultadoEncuesta): number {
    return Object.values(resultado.conteos ?? {}).reduce(
      (total, cantidad) => total + Number(cantidad),
      0,
    );
  }

  porcentaje(
    resultado: ResultadoEncuesta,
    opcion: string,
  ): number {
    const total = this.cantidadTotal(resultado);

    if (!total) return 0;

    return Math.round(
      (Number(resultado.conteos?.[opcion] ?? 0) / total) * 100,
    );
  }

  opcionesGrafico(resultado: ResultadoEncuesta): string[] {
    return [
      ...new Set([
        ...(resultado.opciones ?? []),
        ...Object.keys(resultado.conteos ?? {}),
      ]),
    ];
  }

  /** Más de 6 opciones (ej. slider 1-10): los gráficos usan su versión compacta. */
  muchasOpciones(resultado: ResultadoEncuesta): boolean {
    return this.opcionesGrafico(resultado).length > 6;
  }

  /** Filas que ocupa la leyenda de la torta (2 columnas si hay muchas opciones). */
  filasLeyenda(resultado: ResultadoEncuesta): number {
    const cantidad = this.opcionesGrafico(resultado).length;

    return this.muchasOpciones(resultado) ? Math.ceil(cantidad / 2) : cantidad;
  }

gradienteTorta(resultado: ResultadoEncuesta): string {
  const opciones = this.opcionesGrafico(resultado);
  const total = this.cantidadTotal(resultado);

  if (!total) return '#d9e0ca';

  let acumulado = 0;

  const segmentos = opciones.map((opcion, indice) => {
    const inicio = acumulado;

    acumulado +=
      (Number(resultado.conteos?.[opcion] ?? 0) / total) * 100;

    return `${this.colorOpcion(indice)} ${inicio}% ${acumulado}%`;
  });

  return `conic-gradient(${segmentos.join(', ')})`;
}

  puntosLinea(resultado: ResultadoEncuesta): string {
    const serie = this.resultadosTemporales()
      .filter((punto) => punto.pregunta_id === resultado.pregunta_id)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    if (!serie.length) return '';

    const maximo = Math.max(1, ...serie.map((punto) => punto.respuestas));

    return serie
      .map((punto, indice) => {
        const x =
          serie.length === 1 ? 50 : 8 + indice * (84 / (serie.length - 1));
        const y = 88 - (punto.respuestas / maximo) * 70;

        return `${x},${y}`;
      })
      .join(' ');
  }

  tieneSerieTemporal(resultado: ResultadoEncuesta): boolean {
    return this.resultadosTemporales().some(
      (punto) => punto.pregunta_id === resultado.pregunta_id,
    );
  }

actualizarSlider(id: string, ev: Event): void {
  const v = (ev as CustomEvent).detail?.value;
  if (typeof v === 'number') this.actualizarRespuesta(id, String(v));
}

valorSlider(id: string): number {
  const v = Number(this.respuestas()[id]);
  return Number.isFinite(v) && v > 0 ? v : 1;
}

etiquetaOpcion(opcion: string, tipo?: TipoPregunta): string {
  if (tipo !== 'escala') return opcion;

  const etiquetas: Record<string, string> = {
    '1': 'Muy mala', '2': 'Mala', '3': 'Regular', '4': 'Buena', '5': 'Muy buena',
  };
  return etiquetas[opcion] ?? opcion;
}

irAGrafico(tipo: 'torta' | 'barras' | 'columnas'): void {
  void this.router.navigate(['/encuestas/grafico', tipo], {
    state: { origenEncuestas: this.origenMenu() },
  });
}

  volver(): void {
    void this.router.navigate([this.rutaVolver()]);
  }

volverAEncuestas(): void {
  void this.router.navigate(['/encuestas'], {
    state: { origenEncuestas: this.origenMenu() },
  });
}

  trackPregunta(_: number, pregunta: PreguntaEncuesta): string {
    return pregunta.id;
  }

private async desplazarArriba(): Promise<void> {
  await Promise.resolve();
  const scroller = this.scroller?.nativeElement;
  if (scroller) scroller.scrollTop = 0;
  this.programarAjuste();
}


  private async mostrarMensaje(
    mensaje: string,
    color: 'success' | 'danger',
  ): Promise<void> {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2800,
      position: 'top',
      color,
    });

    await toast.present();
  }
}