import {
  crearClienteAdmin,
  obtenerUsuarioAutenticado,
} from '../_shared/supabase.ts';

import {
  enviarNotificacionFirebase,
} from '../_shared/firebase.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MENSAJES: Record<string, string> = {
  confirmado: 'Tu pedido fue confirmado y ya se está preparando.',
  rechazado: 'Tu pedido fue rechazado. Podés modificarlo y reenviarlo.',
  listo: 'Tu pedido está listo.',
  entregado: 'Tu pedido fue entregado, ¡buen provecho!',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization) throw new Error('Falta la autorización.');

    await obtenerUsuarioAutenticado(authorization);

    const { idUsuario, idPedido, nuevoEstado } = await req.json();

    const supabaseAdmin = crearClienteAdmin();

    const { data: dispositivos, error: errorDispositivos } = await supabaseAdmin
      .from('dispositivos_push')
      .select('id, token')
      .eq('usuario_id', idUsuario)
      .eq('activo', true);

    if (errorDispositivos) throw new Error('No se pudieron obtener los dispositivos.');

    if (!dispositivos || dispositivos.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, enviados: 0, mensaje: 'El cliente no tiene dispositivos activos.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cuerpo = MENSAJES[nuevoEstado] ?? `El estado de tu pedido cambió a ${nuevoEstado}.`;

    let enviados = 0;
    let errores = 0;

    for (const dispositivo of dispositivos) {
      try {
        await enviarNotificacionFirebase(dispositivo.token, 'Estado de tu pedido', cuerpo, {
          tipo: 'estado_pedido',
          idPedido,
        });
        enviados++;
      } catch (error) {
        errores++;
        console.error(`Error enviando al dispositivo ${dispositivo.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, enviados, errores }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error en notify-order-status:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Error desconocido.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});