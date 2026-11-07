
import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';

export type TipoPregunta = 'escala' | 'opcion' | 'multiple' | 'slider' | 'texto';

export interface PreguntaEncuesta {
  id: string;
  encuesta_id: string;
  texto: string;
  tipo: TipoPregunta;
  opciones: string[];
  obligatoria: boolean;
  orden: number;
}

export interface Encuesta {
  id: string;
  titulo: string;
  descripcion: string | null;
  preguntas?: PreguntaEncuesta[];
}

export interface EstadoEncuesta {
  autenticado: boolean;
  puede_responder: boolean;
  respondida: boolean;
  recepcion_confirmada: boolean;
}

export interface ResultadoEncuesta {
  pregunta_id: string;
  pregunta: string;
  tipo: TipoPregunta;
  opciones: string[];
  conteos: Record<string, number>;
}

export interface ResultadoTemporalEncuesta {
  pregunta_id: string;
  fecha: string;
  respuestas: number;
}

@Injectable({
  providedIn: 'root',
})
export class EncuestasService {
  private readonly sup = inject(SupabaseService);

  async obtenerEstado(): Promise<EstadoEncuesta> {
    const { data, error } = await this.sup.client.rpc('estado_encuesta');

    if (error) {
      throw new Error(
        `No se pudo consultar el estado de la encuesta: ${error.message}`,
      );
    }

    return data as EstadoEncuesta;
  }



async obtenerEncuestaActiva(): Promise<Encuesta | null> {
  const { data, error } = await this.sup.client
    .from('encuestas')
    .select(`
      id,
      titulo,
      descripcion,
      encuesta_preguntas (
        id,
        encuesta_id,
        texto,
        tipo,
        opciones,
        obligatoria,
        orden
      )
    `)
    .eq('activa', true)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `No se pudo cargar la encuesta: ${error.message}`,
    );
  }

  if (!data) return null;

  const fila = data as any;

  return {
    id: fila.id,
    titulo: fila.titulo,
    descripcion: fila.descripcion ?? null,
    preguntas: (fila.encuesta_preguntas ?? [])
  .filter((p: PreguntaEncuesta) => p.tipo !== 'texto')
  .sort((a: PreguntaEncuesta, b: PreguntaEncuesta) => a.orden - b.orden),
  };
}



  async obtenerPreguntas(
    encuestaId?: string,
  ): Promise<PreguntaEncuesta[]> {
    const encuesta = await this.obtenerEncuestaActiva();

    if (!encuesta || (encuestaId && encuesta.id !== encuestaId)) {
      return [];
    }

    return encuesta.preguntas ?? [];
  }

  async enviarRespuestas(
    respuestas: Record<string, string | string[]>,
  ): Promise<void> {
    const { error } = await this.sup.client.rpc('enviar_encuesta', {
      p_respuestas: respuestas,
    });

    if (error) {
      const mensaje = error.message.toLowerCase();

      if (mensaje.includes('ya respondiste')) {
        throw new Error(
          'Ya respondiste esta encuesta durante esta estadía.',
        );
      }

      if (
        mensaje.includes('recepción') ||
        mensaje.includes('recibido') ||
        mensaje.includes('pedido')
      ) {
        throw new Error(
          'Primero tenés que confirmar la recepción de tu pedido.',
        );
      }

      throw new Error(
        `No se pudieron guardar las respuestas: ${error.message}`,
      );
    }
  }

  async obtenerResultados(): Promise<ResultadoEncuesta[]> {
    const { data, error } = await this.sup.client.rpc(
      'resultados_encuesta',
    );

    if (error) {
      // la base rechaza la consulta si la persona no está en la lista de espera ni en una mesa
      if (error.message.toLowerCase().includes('permiso')) {
        throw new Error(
          'Los resultados se pueden consultar cuando estás en la lista de espera o en una mesa.',
        );
      }

      throw new Error(
        `No se pudieron cargar los resultados: ${error.message}`,
      );
    }

    return (data ?? []) as ResultadoEncuesta[];
  }

  async obtenerResultadosTemporales(): Promise<
    ResultadoTemporalEncuesta[]
  > {
    const { data, error } = await this.sup.client.rpc(
      'resultados_encuesta_temporales',
    );

    if (error) {
      throw new Error(
        `No se pudo cargar la evolución temporal: ${error.message}`,
      );
    }

    return (data ?? []) as ResultadoTemporalEncuesta[];
  }
}
