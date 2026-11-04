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
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization) throw new Error('Falta la autorización.');

    await obtenerUsuarioAutenticado(authorization);

    const { idPedido } = await req.json();
    if (!idPedido) throw new Error('Falta idPedido.');

    const supabaseAdmin = crearClienteAdmin();

    // Datos del pedido y la mesa, leídos del servidor (no confiamos en lo que manda el front)
    const { data: pedido, error: errorPedido } = await supabaseAdmin
      .from('pedido')
      .select('id_pedido, id_mesa, mesas ( numero )')
      .eq('id_pedido', idPedido)
      .single();

    if (errorPedido || !pedido) throw new Error('No se encontró el pedido.');

    const numeroMesa = (pedido as any).mesas?.numero ?? '';

    // Dispositivos activos de todos los mozos
    const { data: mozos, error: errorMozos } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('perfil', 'mozo');

    if (errorMozos) throw new Error('No se pudieron obtener los mozos.');

    const idsMozos = (mozos ?? []).map((m) => m.id);
    if (idsMozos.length === 0) {
      return json({ ok: true, enviados: 0, mensaje: 'No hay mozos registrados.' });
    }

    const { data: dispositivos, error: errorDispositivos } = await supabaseAdmin
      .from('dispositivos_push')
      .select('id, token')
      .in('usuario_id', idsMozos)
      .eq('activo', true);

    if (errorDispositivos) throw new Error('No se pudieron obtener los dispositivos.');

    if (!dispositivos || dispositivos.length === 0) {
      return json({ ok: true, enviados: 0, mensaje: 'Los mozos no tienen dispositivos activos.' });
    }

    const cuerpo = numeroMesa
      ? `La mesa ${numeroMesa} realizó el pago. Falta confirmarlo.`
      : 'Un cliente realizó el pago. Falta confirmarlo.';

    let enviados = 0;
    let errores = 0;

    for (const dispositivo of dispositivos) {
      try {
        await enviarNotificacionFirebase(dispositivo.token, 'Pago realizado', cuerpo, {
          tipo: 'pago_realizado',
          idPedido: String(idPedido),
        });
        enviados++;
      } catch (error) {
        errores++;
        console.error(`Error enviando al dispositivo ${dispositivo.id}:`, error);
      }
    }

    return json({ ok: true, enviados, errores });
  } catch (error) {
    console.error('Error en notify-pago:', error);
    return json(
      { ok: false, error: error instanceof Error ? error.message : 'Error desconocido.' },
      400,
    );
  }
});