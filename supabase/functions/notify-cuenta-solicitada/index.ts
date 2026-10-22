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

    const { data: mesa } = await supabaseAdmin
      .from('mesas')
      .select('numero')
      .eq('id', idMesa)
      .maybeSingle();

    const numeroMesa = mesa ? String(mesa.numero) : 'sin número';

    const { data: mozos, error: errorMozos } = await supabaseAdmin
      .from('usuarios')
      .select('id, perfil')
      .eq('perfil', 'mozo');

    if (errorMozos) throw new Error('No se pudieron obtener los mozos.');

    const mozoIds = (mozos ?? []).map((m: { id: any; }) => m.id);

    if (mozoIds.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, enviados: 0, mensaje: 'No hay mozos registrados.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: dispositivos, error: errorDispositivos } = await supabaseAdmin
      .from('dispositivos_push')
      .select('id, token')
      .in('usuario_id', mozoIds)
      .eq('activo', true);

    if (errorDispositivos) throw new Error('No se pudieron obtener los dispositivos.');

    if (!dispositivos || dispositivos.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, enviados: 0, mensaje: 'No hay dispositivos activos.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const titulo = 'Cuenta solicitada';
    const cuerpo = `La mesa ${numeroMesa} pidió la cuenta.`;

    let enviados = 0;
    let errores = 0;

    for (const dispositivo of dispositivos) {
      try {
        await enviarNotificacionFirebase(dispositivo.token, titulo, cuerpo, {
          tipo: 'cuenta_solicitada',
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
    console.error('Error en notify-cuenta-solicitada:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Error desconocido.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});