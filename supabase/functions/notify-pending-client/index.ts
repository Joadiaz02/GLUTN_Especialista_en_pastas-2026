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
      req.headers.get('Authorization');

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
      data: cliente,
      error: errorCliente,
    } =
      await supabaseAdmin
        .from('usuarios')
        .select(
          'id, nombre, apellido, perfil, estado_aprobacion'
        )
        .eq(
          'id',
          usuario.id
        )
        .maybeSingle();

    if (errorCliente) {
      throw new Error(
        'No se pudo verificar el usuario.'
      );
    }

    if (!cliente) {
      throw new Error(
        'El usuario no existe.'
      );
    }

    if (
      cliente.perfil !==
      'cliente_registrado'
    ) {
      throw new Error(
        'El usuario no es un cliente registrado.'
      );
    }

    if (
      cliente.estado_aprobacion !==
      'pendiente'
    ) {
      return new Response(
        JSON.stringify({
          ok: true,
          enviados: 0,
          mensaje:
            'El cliente no está pendiente de aprobación.',
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
      data: gestores,
      error: errorGestores,
    } =
      await supabaseAdmin
        .from('usuarios')
        .select(
          'id, perfil'
        )
        .in(
          'perfil',
          [
            'dueno',
            'supervisor',
          ]
        );

    if (errorGestores) {
      throw new Error(
        'No se pudieron obtener los gestores.'
      );
    }

    const gestorIds =
      (gestores ?? []).map(
        (gestor) => gestor.id
      );

    if (
      gestorIds.length === 0
    ) {
      return new Response(
        JSON.stringify({
          ok: true,
          enviados: 0,
          errores: 0,
          mensaje:
            'No hay dueños ni supervisores registrados.',
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
      error: errorDispositivos,
    } =
      await supabaseAdmin
        .from('dispositivos_push')
        .select(
          'id, usuario_id, token'
        )
        .in(
          'usuario_id',
          gestorIds
        )
        .eq(
          'activo',
          true
        );

    if (errorDispositivos) {
      throw new Error(
        'No se pudieron obtener los dispositivos de los gestores.'
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
            'No hay dispositivos Push activos para los gestores.',
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

    const nombreCliente =
      `${cliente.nombre ?? ''} ${cliente.apellido ?? ''}`
        .trim();

    const titulo =
      'Nuevo cliente pendiente';

    const cuerpo =
      nombreCliente
        ? `${nombreCliente} está esperando aprobación.`
        : 'Hay un nuevo cliente esperando aprobación.';

    let enviados = 0;
    let errores = 0;

    for (
      const dispositivo of dispositivos
    ) {
      try {
        await enviarNotificacionFirebase(
          dispositivo.token,
          titulo,
          cuerpo,
          {
            tipo:
              'cliente_pendiente',
            clienteId:
              cliente.id,
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
      'Error en notify-pending-client:',
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