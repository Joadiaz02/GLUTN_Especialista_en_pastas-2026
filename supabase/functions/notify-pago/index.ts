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

// perfiles que reciben el aviso de pago
const PERFILES_DESTINO = ['mozo', 'dueno', 'supervisor'];

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

    const { idPedido, evento } = await req.json();
    if (!idPedido) throw new Error('Falta idPedido.');

    const supabaseAdmin = crearClienteAdmin();

    const { data: pedido, error: errorPedido } = await supabaseAdmin
      .from('pedido')
      .select('id_pedido, id_mesa, mesas ( numero )')
      .eq('id_pedido', idPedido)
      .single();

    if (errorPedido || !pedido) throw new Error('No se encontró el pedido.');

    const numeroMesa = (pedido as any).mesas?.numero ?? '';

    const { data: destinatarios, error: errorDestinatarios } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .in('perfil', PERFILES_DESTINO);

    if (errorDestinatarios) throw new Error('No se pudieron obtener los destinatarios.');

    const idsDestinatarios = (destinatarios ?? []).map((u) => u.id);
    if (idsDestinatarios.length === 0) {
      return json({ ok: true, enviados: 0, mensaje: 'No hay destinatarios registrados.' });
    }

    const { data: dispositivos, error: errorDispositivos } = await supabaseAdmin
      .from('dispositivos_push')
      .select('id, token')
      .in('usuario_id', idsDestinatarios)
      .eq('activo', true);

    if (errorDispositivos) throw new Error('No se pudieron obtener los dispositivos.');

    // un mismo token puede estar en más de un usuario: se envía una sola vez
    const dispositivosUnicos: any[] = [
      ...new Map((dispositivos ?? []).map((d) => [d.token, d])).values(),
    ];

    if (dispositivosUnicos.length === 0) {
      return json({ ok: true, enviados: 0, mensaje: 'No hay dispositivos activos.' });
    }

    const confirmado = evento === 'confirmado';

    const titulo = confirmado ? 'Pago confirmado' : 'Pago realizado';
    const tipo = confirmado ? 'pago_confirmado' : 'pago_realizado';
    const cuerpo = confirmado
      ? numeroMesa
        ? `Se confirmó el pago de la mesa ${numeroMesa}.`
        : 'Se confirmó el pago de una cuenta.'
      : numeroMesa
        ? `La mesa ${numeroMesa} realizó el pago. Falta confirmarlo.`
        : 'Un cliente realizó el pago. Falta confirmarlo.';

    let enviados = 0;
    let errores = 0;

    for (const dispositivo of dispositivosUnicos) {
      try {
        await enviarNotificacionFirebase(dispositivo.token, titulo, cuerpo, {
          tipo,
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