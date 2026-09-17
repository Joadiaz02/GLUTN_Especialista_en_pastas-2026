import {
  crearClienteAdmin,
  obtenerUsuarioAutenticado,
  verificarGestor,
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

    await verificarGestor(
      supabaseAdmin,
      usuario.id
    );

    const body =
      await req.json();

    const {
      usuarioIds,
      titulo,
      cuerpo,
      datos,
    } = body;

    if (
      !Array.isArray(usuarioIds) ||
      usuarioIds.length === 0
    ) {
      throw new Error(
        'Debés indicar al menos un usuario.'
      );
    }

    if (
      typeof titulo !== 'string' ||
      !titulo.trim()
    ) {
      throw new Error(
        'El título es obligatorio.'
      );
    }

    if (
      typeof cuerpo !== 'string' ||
      !cuerpo.trim()
    ) {
      throw new Error(
        'El cuerpo es obligatorio.'
      );
    }

    const {
      data: dispositivos,
      error,
    } =
      await supabaseAdmin
        .from('dispositivos_push')
        .select(
          'id, usuario_id, token'
        )
        .in(
          'usuario_id',
          usuarioIds
        )
        .eq(
          'activo',
          true
        );

    if (error) {
      throw new Error(
        'No se pudieron obtener los dispositivos.'
      );
    }

    if (
      !dispositivos ||
      dispositivos.length === 0
    ) {
      return new Response(
        JSON.stringify({
          ok: true,
          enviados: 0,
          errores: 0,
          dispositivosEncontrados: 0,
          mensaje:
            'No hay dispositivos activos para los usuarios indicados.',
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
    }

    let enviados = 0;
    let errores = 0;

    for (
      const dispositivo of dispositivos
    ) {
      try {
        await enviarNotificacionFirebase(
          dispositivo.token,
          titulo.trim(),
          cuerpo.trim(),
          datos
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

    return new Response(
      JSON.stringify({
        ok: true,
        enviados,
        errores,
        dispositivosEncontrados:
          dispositivos.length,
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
      'Error en send-push:',
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