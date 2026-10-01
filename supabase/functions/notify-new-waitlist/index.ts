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
      entryId,
    } = await req.json();

    if (!entryId) {
      throw new Error(
        'Falta el identificador de la lista de espera.'
      );
    }

    const {
      data: entry,
      error: entryError,
    } = await supabaseAdmin
      .from('lista_espera')
      .select(
        'id, usuario_id, estado, comensales'
      )
      .eq('id', entryId)
      .maybeSingle();

    if (entryError) {
      throw entryError;
    }

    if (
      !entry ||
      entry.usuario_id !==
        usuario.id ||
      entry.estado !==
        'esperando'
    ) {
      throw new Error(
        'La entrada de la lista de espera no es válida.'
      );
    }

    const {
      data: metres,
      error: metresError,
    } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('perfil', 'metre');

    if (metresError) {
      throw metresError;
    }

    const metreIds =
      (metres ?? []).map(
        (item) => item.id
      );

    if (metreIds.length === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          enviados: 0,
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

    const {
      data: dispositivos,
      error: devicesError,
    } = await supabaseAdmin
      .from('dispositivos_push')
      .select(
        'id, usuario_id, token'
      )
      .in(
        'usuario_id',
        metreIds
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
        const cantidad =
          entry.comensales ?? 1;

        await enviarNotificacionFirebase(
          dispositivo.token,
          'Nuevo cliente en lista de espera',
          `${cantidad} ${
            cantidad === 1
              ? 'comensal espera'
              : 'comensales esperan'
          } una mesa.`,
          {
            tipo:
              'lista_espera',
            entryId:
              entry.id,
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
      'Error en notify-new-waitlist:',
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