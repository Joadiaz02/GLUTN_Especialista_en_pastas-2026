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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(
      'ok',
      {
        headers: corsHeaders,
      }
    );
  }

  try {
    const authorization =
      req.headers.get(
        'Authorization'
      );

    if (!authorization) {
      throw new Error(
        'Falta la autorización.'
      );
    }

    const usuario =
      await obtenerUsuarioAutenticado(
        authorization
      );

    const supabaseAdmin =
      crearClienteAdmin();

    const {
      usuarioId,
      mesaNumero,
    } = await req.json();

    const {
      data: gestor,
      error: gestorError,
    } = await supabaseAdmin
      .from('usuarios')
      .select('perfil')
      .eq(
        'id',
        usuario.id
      )
      .maybeSingle();

    if (gestorError) {
      throw gestorError;
    }

    if (
      !gestor ||
      ![
        'dueno',
        'supervisor',
        'metre',
      ].includes(gestor.perfil)
    ) {
      throw new Error(
        'No tenés permisos para enviar esta notificación.'
      );
    }

    if (
      !usuarioId ||
      mesaNumero === undefined
    ) {
      throw new Error(
        'Faltan datos para notificar la asignación.'
      );
    }

    const {
      data: dispositivos,
      error: devicesError,
    } = await supabaseAdmin
      .from('dispositivos_push')
      .select(
        'id, usuario_id, token'
      )
      .eq(
        'usuario_id',
        usuarioId
      )
      .eq(
        'activo',
        true
      );

    if (devicesError) {
      throw devicesError;
    }

    let enviados = 0;

    for (
      const dispositivo of
      dispositivos ?? []
    ) {
      try {
        await enviarNotificacionFirebase(
          dispositivo.token,
          '¡Tu mesa está lista!',
          `Te asignaron la mesa ${mesaNumero}.`,
          {
            tipo:
              'mesa_asignada',
            mesaNumero,
          }
        );

        enviados++;
      } catch (error) {
        console.error(
          `Error enviando al dispositivo ${dispositivo.id}:`,
          error
        );
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        enviados,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type':
            'application/json',
        },
      }
    );
  } catch (error) {
    console.error(
      'Error en notify-table-assigned:',
      error
    );

    return new Response(
      JSON.stringify({
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error desconocido.',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type':
            'application/json',
        },
      }
    );
  }
});