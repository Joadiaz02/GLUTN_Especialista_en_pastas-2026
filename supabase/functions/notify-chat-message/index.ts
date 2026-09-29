import {
  crearClienteAdmin,
  obtenerUsuarioAutenticado,
} from '../_shared/supabase.ts';

import {
  enviarNotificacionFirebase,
} from '../_shared/firebase.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const LARGO_MAXIMO_CUERPO = 120;

function responder(
  cuerpo: Record<string, unknown>,
  status = 200
): Response {
  return new Response(
    JSON.stringify(cuerpo),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}

function recortar(texto: string): string {
  return texto.length > LARGO_MAXIMO_CUERPO
    ? `${texto.slice(0, LARGO_MAXIMO_CUERPO)}…`
    : texto;
}

// avisa los mensajes del chat: del cliente a los mozos, del mozo al cliente
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get('Authorization');

    if (!authorization) {
      throw new Error('Falta la autorización.');
    }

    const usuario =
      await obtenerUsuarioAutenticado(authorization);

    const { id_mensaje: idMensaje } = await req.json();

    if (typeof idMensaje !== 'string' || !idMensaje) {
      throw new Error('Falta indicar el mensaje.');
    }

    const supabaseAdmin = crearClienteAdmin();

    const { data: mensaje, error: errorMensaje } =
      await supabaseAdmin
        .from('mensajes')
        .select(
          'id, id_autor, nombre, perfil, numero_mesa, texto, en_respuesta_a, created_at'
        )
        .eq('id', idMensaje)
        .maybeSingle();

    if (errorMensaje || !mensaje) {
      throw new Error('No se encontró el mensaje.');
    }

    // solo el autor pide el aviso
    if (mensaje.id_autor !== usuario.id) {
      throw new Error('No tenés permisos para realizar esta acción.');
    }

    let destinatarios: string[] = [];
    let titulo: string;
    let cuerpo: string;
    let tipo: string;

    if (mensaje.perfil === 'mozo') {
      let idCliente: string | null = null;

      if (mensaje.en_respuesta_a) {
        const { data: consulta } = await supabaseAdmin
          .from('mensajes')
          .select('id_autor, perfil')
          .eq('id', mensaje.en_respuesta_a)
          .maybeSingle();

        if (consulta && consulta.perfil !== 'mozo') {
          idCliente = consulta.id_autor;
        }
      }

      if (!idCliente) {
        const { data: ultima } = await supabaseAdmin
          .from('mensajes')
          .select('id_autor')
          .neq('perfil', 'mozo')
          .lt('created_at', mensaje.created_at)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        idCliente = ultima?.id_autor ?? null;
      }

      if (idCliente) {
        destinatarios = [idCliente];
      }

      tipo = 'respuesta_mozo';
      titulo = 'Respondieron tu consulta';
      cuerpo = `${mensaje.nombre}: ${recortar(mensaje.texto)}`;
    } else {
      const { data: mozos, error: errorMozos } =
        await supabaseAdmin
          .from('usuarios')
          .select('id')
          .eq('perfil', 'mozo');

      if (errorMozos) {
        throw new Error('No se pudieron obtener los mozos.');
      }

      destinatarios = (mozos ?? []).map((mozo) => mozo.id);

      tipo = 'consulta_mozo';
      titulo = mensaje.numero_mesa
        ? `Nueva consulta de la mesa ${mensaje.numero_mesa}`
        : `Nueva consulta de ${mensaje.nombre}`;
      cuerpo = recortar(mensaje.texto);
    }

    // nadie recibe su propio aviso
    destinatarios = destinatarios.filter(
      (id) => id !== usuario.id
    );

    if (destinatarios.length === 0) {
      return responder({
        ok: true,
        enviados: 0,
        errores: 0,
        mensaje: 'No hay destinatarios para este mensaje.',
      });
    }

    const { data: dispositivos, error: errorDispositivos } =
      await supabaseAdmin
        .from('dispositivos_push')
        .select('id, usuario_id, token')
        .in('usuario_id', destinatarios)
        .eq('activo', true);

    if (errorDispositivos) {
      throw new Error(
        'No se pudieron obtener los dispositivos de los destinatarios.'
      );
    }

    if (!dispositivos || dispositivos.length === 0) {
      return responder({
        ok: true,
        enviados: 0,
        errores: 0,
        dispositivosEncontrados: 0,
        mensaje: 'No hay dispositivos Push activos para los destinatarios.',
      });
    }

    let enviados = 0;
    let errores = 0;

    for (const dispositivo of dispositivos) {
      try {
        await enviarNotificacionFirebase(
          dispositivo.token,
          titulo,
          cuerpo,
          {
            tipo,
            mensajeId: mensaje.id,
          }
        );

        enviados++;
      } catch (error) {
        errores++;

        console.error(
          `Error enviando al dispositivo ${dispositivo.id}:`,
          error
        );
      }
    }

    return responder({
      ok: true,
      enviados,
      errores,
      dispositivosEncontrados: dispositivos.length,
    });
  } catch (error) {
    console.error('Error en notify-chat-message:', error);

    return responder(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error desconocido.',
      },
      400
    );
  }
});
