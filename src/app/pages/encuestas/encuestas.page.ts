
import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonSpinner,
  ToastController,
} from '@ionic/angular';
import { Subscription } from 'rxjs';

import {
  EncuestasService,
  EstadoEncuesta,
  PreguntaEncuesta,
  ResultadoEncuesta,
  ResultadoTemporalEncuesta,
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
  ],
  templateUrl: './encuestas.page.html',
  styleUrl: './encuestas.page.scss',
})
export class EncuestasPage implements OnInit, OnDestroy {
  private readonly encuestasService = inject(EncuestasService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastController = inject(ToastController);

  private routeSubscription?: Subscription;

  cargando = signal(true);
  enviando = signal(false);
  error = signal('');

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

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      this.tipoGrafico.set(params.get('tipo') ?? '');
      void this.cargar();
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
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

      // La RPC temporal se agrega mediante una migración opcional. Si todavía
      // no está aplicada, el resto de la encuesta sigue funcionando.
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

      const preguntas =
        await this.encuestasService.obtenerPreguntas(encuesta.id);

      this.preguntas.set(preguntas);
    } catch (error: unknown) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'No pudimos cargar las encuestas. Intentá nuevamente.',
      );
    } finally {
      this.cargando.set(false);
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

  gradienteTorta(resultado: ResultadoEncuesta): string {
    const colores = [
      '#e76f45',
      '#d9a441',
      '#657a4d',
      '#8b79a8',
      '#d9e0ca',
      '#6b9bb8',
    ];

    const opciones = this.opcionesGrafico(resultado);
    const total = this.cantidadTotal(resultado);

    if (!total) return '#d9e0ca';

    let acumulado = 0;

    const segmentos = opciones.map((opcion, indice) => {
      const inicio = acumulado;

      acumulado +=
        (Number(resultado.conteos?.[opcion] ?? 0) / total) * 100;

      return `${colores[indice % colores.length]} ${inicio}% ${acumulado}%`;
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

  irAGrafico(tipo: 'torta' | 'barras' | 'lineal'): void {
    void this.router.navigate(['/encuestas/grafico', tipo]);
  }

  volver(): void {
    void this.router.navigate(['/waiting-room']);
  }

  volverAEncuestas(): void {
    void this.router.navigate(['/encuestas']);
  }

  trackPregunta(_: number, pregunta: PreguntaEncuesta): string {
    return pregunta.id;
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
