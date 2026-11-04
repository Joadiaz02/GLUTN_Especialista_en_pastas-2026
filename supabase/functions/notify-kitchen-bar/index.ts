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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization) throw new Error('Falta la autorización.');

    await obtenerUsuarioAutenticado(authorization);

    const { idPedido, idMesa } = await req.json();

    const supabaseAdmin = crearClienteAdmin();

    // el pedido manda el UUID de la mesa, acá buscamos su número
    const { data: mesa } = await supabaseAdmin
      .from('mesas')
      .select('numero')
      .eq('id', idMesa)
      .maybeSingle();

    const numeroMesa = mesa ? String(mesa.numero) : 'sin número';

    const { data: personal, error: errorPersonal } = await supabaseAdmin
      .from('usuarios')
      .select('id, perfil')
      .in('perfil', ['cocinero', 'cantinero']);

    if (errorPersonal) throw new Error('No se pudo obtener el personal de cocina/bar.');

    const idsPersonal = (personal ?? []).map((p: { id: any; }) => p.id);

    if (idsPersonal.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, enviados: 0, mensaje: 'No hay cocineros ni cantineros registrados.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: dispositivos, error: errorDispositivos } = await supabaseAdmin
      .from('dispositivos_push')
      .select('id, token')
      .in('usuario_id', idsPersonal)
      .eq('activo', true);

    if (errorDispositivos) throw new Error('No se pudieron obtener los dispositivos.');

    if (!dispositivos || dispositivos.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, enviados: 0, mensaje: 'No hay dispositivos activos.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const titulo = 'Pedido confirmado';
    const cuerpo = `Hay un pedido nuevo para preparar de la mesa ${numeroMesa}.`;

    let enviados = 0;
    let errores = 0;

    for (const dispositivo of dispositivos) {
      try {
        await enviarNotificacionFirebase(dispositivo.token, titulo, cuerpo, {
          tipo: 'pedido_para_preparar',
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
    console.error('Error en notify-kitchen-bar:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Error desconocido.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});