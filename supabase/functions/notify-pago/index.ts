import {
  crearClienteAdmin,
  obtenerUsuarioAutenticado,
} from '../_shared/supabase.ts';

import {
  enviarNotificacionFirebase,
} from '../_shared/firebase.ts';

// avisa a los mozos cuando el pedido está completo

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function responder(cuerpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization) throw new Error('Falta la autorización.');

    await obtenerUsuarioAutenticado(authorization);

    const { idPedido } = await req.json();
    if (!idPedido) throw new Error('Falta el pedido.');

    const supabaseAdmin = crearClienteAdmin();

    // solo avisa si el pedido está listo
    const { data: pedido, error: errorPedido } = await supabaseAdmin
      .from('pedido')
      .select('id_mesa, estado_pedido')
      .eq('id_pedido', idPedido)
      .maybeSingle();

    if (errorPedido || !pedido) throw new Error('No se encontró el pedido.');

    if (pedido.estado_pedido !== 'listo') {
      return responder({ ok: true, enviados: 0, mensaje: 'El pedido todavía no está listo.' });
    }

    const { data: mesa } = await supabaseAdmin
      .from('mesas')
      .select('numero')
      .eq('id', pedido.id_mesa)
      .maybeSingle();

    const { data: mozos, error: errorMozos } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('perfil', 'mozo');

    if (errorMozos) throw new Error('No se pudieron obtener los mozos.');

    const mozoIds = (mozos ?? []).map((m) => m.id);

    if (mozoIds.length === 0) {
      return responder({ ok: true, enviados: 0, mensaje: 'No hay mozos registrados.' });
    }

    const { data: dispositivos, error: errorDispositivos } = await supabaseAdmin
      .from('dispositivos_push')
      .select('id, token')
      .in('usuario_id', mozoIds)
      .eq('activo', true);

    if (errorDispositivos) throw new Error('No se pudieron obtener los dispositivos.');

    const cuerpo = mesa
      ? `El pedido de la mesa ${mesa.numero} está completo. Ya podés llevarlo.`
      : 'Hay un pedido completo. Ya podés llevarlo.';

    let enviados = 0;
    let errores = 0;

    for (const dispositivo of dispositivos ?? []) {
      try {
        await enviarNotificacionFirebase(dispositivo.token, 'Pedido listo', cuerpo, {
          tipo: 'pedido_listo',
          idPedido,
        });
        enviados++;
      } catch (error) {
        errores++;
        console.error(`Error enviando al dispositivo ${dispositivo.id}:`, error);
      }
    }

    return responder({ ok: true, enviados, errores });
  } catch (error) {
    console.error('Error en notify-pedido-listo:', error);
    return responder(
      { ok: false, error: error instanceof Error ? error.message : 'Error desconocido.' },
      400
    );
  }
});