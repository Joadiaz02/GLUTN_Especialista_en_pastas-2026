import {
  crearClienteAdmin,
  obtenerUsuarioAutenticado,
} from '../_shared/supabase.ts';

import {
  generarFacturaPdf,
  type LineaFactura,
} from '../_shared/factura-pdf.ts';

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

const PROPINAS_VALIDAS = [0, 5, 10, 15, 20];

// el ticket guarda importes; el porcentaje se recupera del subtotal
function porcentaje(importe: number, subtotal: number): number {
  return subtotal > 0 ? Math.round((importe * 100) / subtotal) : 0;
}

// el logo viaja con la función; si no está, la factura sale igual sin logo
async function leerLogo(): Promise<Uint8Array | undefined> {
  try {
    return await Deno.readFile(new URL('./logo.png', import.meta.url));
  } catch {
    return undefined;
  }
}

// arma la factura del pago confirmado del cliente; no guarda el PDF en ningún lado
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization) throw new Error('Falta la autorización.');

    const usuario = await obtenerUsuarioAutenticado(authorization);

    const { idPedido } = await req.json();
    if (!idPedido) throw new Error('Falta idPedido.');

    const supabaseAdmin = crearClienteAdmin();

    const { data: pedido, error: errorPedido } = await supabaseAdmin
      .from('pedido')
      .select('id_pedido, id_mesa, id_usuario, id_estadia')
      .eq('id_pedido', idPedido)
      .maybeSingle();

    if (errorPedido || !pedido) throw new Error('No se encontró el pedido.');

    // cada cliente solo puede bajar su propia factura
    if (pedido.id_usuario !== usuario.id) throw new Error('Este pedido no es tuyo.');

    // todos los pedidos pagados de la misma estadía van en la misma factura
    let idsPedidos = [pedido.id_pedido];

    if (pedido.id_estadia) {
      const { data: pedidos, error: errorPedidos } = await supabaseAdmin
        .from('pedido')
        .select('id_pedido')
        .eq('id_usuario', usuario.id)
        .eq('id_estadia', pedido.id_estadia)
        .eq('estado_pedido', 'pagado');

      if (errorPedidos) throw new Error('No se pudieron leer los pedidos.');

      if (pedidos && pedidos.length > 0) {
        idsPedidos = pedidos.map((p) => p.id_pedido);
      }
    }

    const { data: ticket, error: errorTicket } = await supabaseAdmin
      .from('ticket')
      .select('id_ticket, id_pedido, propina, total_final, fecha_emision_ticket')
      .in('id_pedido', idsPedidos)
      .order('fecha_emision_ticket', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (errorTicket || !ticket) throw new Error('Todavía no hay un pago registrado.');

    const { data: items, error: errorItems } = await supabaseAdmin
      .from('pedido_item')
      .select('cantidad, precio_unitario, carta ( nombre )')
      .in('id_pedido', idsPedidos);

    if (errorItems) throw new Error('No se pudo leer el detalle del pedido.');

    const lineas: LineaFactura[] = (items ?? []).map((item) => ({
      nombre: (item as any).carta?.nombre ?? 'Producto',
      cantidad: item.cantidad,
      precioUnitario: item.precio_unitario,
    }));

    const subtotal = lineas.reduce((suma, l) => suma + l.precioUnitario * l.cantidad, 0);
    const descuento = subtotal + ticket.propina - ticket.total_final;

    // la propina se elige entre valores fijos; se toma el más cercano por los redondeos
    const propinaCalculada = porcentaje(ticket.propina, subtotal);
    const propinaPorcentaje = PROPINAS_VALIDAS.reduce((cercano, valor) =>
      Math.abs(valor - propinaCalculada) < Math.abs(cercano - propinaCalculada) ? valor : cercano
    );

    const [{ data: mesa }, { data: cliente }, { data: cuenta }] = await Promise.all([
      supabaseAdmin.from('mesas').select('numero').eq('id', pedido.id_mesa).maybeSingle(),
      supabaseAdmin.from('usuarios').select('nombre, apellido, documento, perfil').eq('id', usuario.id).maybeSingle(),
      supabaseAdmin.auth.admin.getUserById(usuario.id),
    ]);

    const anonimo = cliente?.perfil === 'cliente_anonimo';

    const pdf = await generarFacturaPdf(
      {
        numero: ticket.id_ticket.slice(0, 8).toUpperCase(),
        fecha: new Date(ticket.fecha_emision_ticket),
        numeroPedido: ticket.id_pedido.slice(0, 8).toUpperCase(),
        mesa: mesa?.numero != null ? String(mesa.numero) : null,
        cliente: {
          nombre: cliente?.nombre ?? 'Cliente',
          apellido: anonimo ? null : cliente?.apellido,
          documento: cliente?.documento,
          correo: cuenta?.user?.email ?? usuario.email,
          anonimo,
        },
        lineas,
        descuentoPorcentaje: Math.max(0, porcentaje(descuento, subtotal)),
        propinaPorcentaje,
        // la factura muestra exactamente lo que se cobró
        importesCobrados: { descuento: Math.max(0, descuento), propina: ticket.propina },
      },
      await leerLogo(),
    );

    return new Response(pdf, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="factura-glutn-${ticket.id_ticket.slice(0, 8)}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error en factura:', error);
    return json(
      { ok: false, error: error instanceof Error ? error.message : 'Error desconocido.' },
      400,
    );
  }
});
