import {
  obtenerUsuarioAutenticado,
  crearClienteAdmin,
  verificarGestor,
} from '../_shared/supabase.ts';

import {
  enviarGmail,
} from '../_shared/gmail.ts';

import {
  crearEmailPendiente,
  crearEmailAprobacion,
  crearEmailRechazo,
} from '../_shared/email-templates.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':
    'POST, OPTIONS',
};

type EstadoCliente =
  | 'pendiente'
  | 'aprobado'
  | 'rechazado';

interface RequestBody {
  clienteId: string;
  estado: EstadoCliente;
  motivo?: string;
}

function respuestaJson(
  body: unknown,
  status = 200
): Response {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type':
          'application/json',
      },
    }
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(
      'ok',
      {
        headers: corsHeaders,
      }
    );
  }

  if (req.method !== 'POST') {
    return respuestaJson(
      {
        error:
          'Método no permitido.',
      },
      405
    );
  }

  try {
    const authorization =
      req.headers.get(
        'Authorization'
      );

    if (!authorization) {
      return respuestaJson(
        {
          error:
            'No autenticado.',
        },
        401
      );
    }

    const usuario =
      await obtenerUsuarioAutenticado(
        authorization
      );

    const supabaseAdmin =
      crearClienteAdmin();

    const body =
      await req.json() as RequestBody;

    const {
      clienteId,
      estado,
      motivo,
    } = body;

    if (
      !clienteId ||
      ![
        'pendiente',
        'aprobado',
        'rechazado',
      ].includes(estado)
    ) {
      return respuestaJson(
        {
          error:
            'Datos de notificación inválidos.',
        },
        400
      );
    }

    if (
      estado === 'rechazado' &&
      !motivo?.trim()
    ) {
      return respuestaJson(
        {
          error:
            'El motivo del rechazo es obligatorio.',
        },
        400
      );
    }

    const {
      data: cliente,
      error: clienteError,
    } =
      await supabaseAdmin
        .from('usuarios')
        .select(`
          id,
          nombre,
          apellido,
          perfil,
          estado_aprobacion,
          motivo_rechazo
        `)
        .eq(
          'id',
          clienteId
        )
        .eq(
          'perfil',
          'cliente_registrado'
        )
        .maybeSingle();

    if (
      clienteError ||
      !cliente
    ) {
      return respuestaJson(
        {
          error:
            'Cliente no encontrado.',
        },
        404
      );
    }

    if (estado === 'pendiente') {
      if (
        usuario.id !==
        clienteId
      ) {
        return respuestaJson(
          {
            error:
              'No tenés permisos para enviar esta notificación.',
          },
          403
        );
      }

      if (
        cliente.estado_aprobacion !==
        'pendiente'
      ) {
        return respuestaJson(
          {
            error:
              'El cliente ya fue gestionado.',
          },
          409
        );
      }
    } else {
      await verificarGestor(
        supabaseAdmin,
        usuario.id
      );

      if (
        cliente.estado_aprobacion !==
        estado
      ) {
        return respuestaJson(
          {
            error:
              'El estado del cliente no coincide con la notificación.',
          },
          409
        );
      }
    }

    const {
      data: authUserData,
      error: authUserError,
    } =
      await supabaseAdmin.auth.admin
        .getUserById(
          clienteId
        );

    if (
      authUserError ||
      !authUserData?.user
    ) {
      throw new Error(
        'No se pudo obtener el usuario.'
      );
    }

    const email =
      authUserData.user.email;

    if (!email) {
      throw new Error(
        'El cliente no tiene un correo electrónico.'
      );
    }

    const nombre =
      cliente.nombre ?? '';

    const apellido =
      cliente.apellido ?? '';

    let html: string;
    let asunto: string;

    if (estado === 'pendiente') {
      asunto =
        'GLUTN - Tu cuenta está pendiente de aprobación';

      html =
        crearEmailPendiente(
          nombre,
          apellido
        );
    } else if (
      estado === 'aprobado'
    ) {
      asunto =
        'GLUTN - Tu cuenta fue aprobada';

      html =
        crearEmailAprobacion(
          nombre,
          apellido
        );
    } else {
      asunto =
        'GLUTN - Tu cuenta no fue aprobada';

      html =
        crearEmailRechazo(
          nombre,
          apellido,
          motivo?.trim() ??
            cliente.motivo_rechazo ??
            'No especificado.'
        );
    }

    await enviarGmail(
      email,
      asunto,
      html
    );

    return respuestaJson({
      ok: true,
      estado,
    });

  } catch (error) {
    console.error(
      'Error en send-client-status-email:',
      error
    );

    const mensaje =
      error instanceof Error
        ? error.message
        : 'Error interno.';

    if (
      mensaje ===
      'Sesión inválida.'
    ) {
      return respuestaJson(
        {
          error: mensaje,
        },
        401
      );
    }

    if (
      mensaje.includes(
        'No tenés permisos'
      )
    ) {
      return respuestaJson(
        {
          error: mensaje,
        },
        403
      );
    }

    return respuestaJson(
      {
        error: mensaje,
      },
      500
    );
  }
});