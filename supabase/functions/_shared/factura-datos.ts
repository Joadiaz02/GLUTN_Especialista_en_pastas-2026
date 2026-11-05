import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

import type {
  DatosFactura,
  LineaFactura,
} from './factura-pdf.ts';

const PROPINAS_VALIDAS = [0, 5, 10, 15, 20];

// el ticket guarda importes; el porcentaje se recupera del subtotal
function porcentaje(importe: number, subtotal: number): number {
  return subtotal > 0 ? Math.round((importe * 100) / subtotal) : 0;
}

export interface FacturaArmada {
  datos: DatosFactura;
  idPedido: string;
  idTicket: string;
  idUsuario: string;
  numeroFactura: string;
  numeroMesa: string | null;
  correo: string | null;
  totalCobrado: number;
}

// Reúne los datos de la factura de un pago ya confirmado.
// Usa el mismo criterio que la función "factura": todos los pedidos pagados
// de la misma estadía van en la misma factura.
export async function armarFactura(
  admin: SupabaseClient,
  idPedido: string,
): Promise<FacturaArmada> {
  const { data: pedido, error: errorPedido } = await admin
    .from('pedido')
    .select('id_pedido, id_mesa, id_usuario, id_estadia, estado_pedido')
    .eq('id_pedido', idPedido)
    .maybeSingle();

  if (errorPedido || !pedido) throw new Error('No se encontró el pedido.');

  if (pedido.estado_pedido !== 'pagado') {
    throw new Error('El pago todavía no fue confirmado.');
  }

  let idsPedidos: string[] = [pedido.id_pedido];

  if (pedido.id_estadia) {
    const { data: pedidos, error: errorPedidos } = await admin
      .from('pedido')
      .select('id_pedido')
      .eq('id_usuario', pedido.id_usuario)
      .eq('id_estadia', pedido.id_estadia)
      .eq('estado_pedido', 'pagado')
      .order('fecha_emision_pedido', { ascending: true });

    if (errorPedidos) throw new Error('No se pudieron leer los pedidos.');

    if (pedidos && pedidos.length > 0) {
      idsPedidos = pedidos.map((p) => p.id_pedido);
    }
  }

  const { data: ticket, error: errorTicket } = await admin
    .from('ticket')
    .select('id_ticket, id_pedido, propina, total_final, fecha_emision_ticket')
    .in('id_pedido', idsPedidos)
    .order('fecha_emision_ticket', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (errorTicket || !ticket) throw new Error('Todavía no hay un pago registrado.');

  const { data: items, error: errorItems } = await admin
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
    admin.from('mesas').select('numero').eq('id', pedido.id_mesa).maybeSingle(),
    admin
      .from('usuarios')
      .select('nombre, apellido, documento, perfil')
      .eq('id', pedido.id_usuario)
      .maybeSingle(),
    admin.auth.admin.getUserById(pedido.id_usuario),
  ]);

  const anonimo = cliente?.perfil === 'cliente_anonimo';
  const correo: string | null = cuenta?.user?.email ?? null;
  const numeroMesa = mesa?.numero != null ? String(mesa.numero) : null;
  const numeroFactura = ticket.id_ticket.slice(0, 8).toUpperCase();

  const datos: DatosFactura = {
    numero: numeroFactura,
    fecha: new Date(ticket.fecha_emision_ticket),
    // todos los pedidos de la cuenta, en el orden en que se hicieron: pedido a - pedido b - pedido c
    numeroPedido: idsPedidos.map((id) => id.slice(0, 8).toUpperCase()).join(' - '),
    mesa: numeroMesa,
    cliente: {
      nombre: cliente?.nombre ?? 'Cliente',
      apellido: anonimo ? null : cliente?.apellido,
      documento: cliente?.documento,
      correo,
      anonimo,
    },
    lineas,
    descuentoPorcentaje: Math.max(0, porcentaje(descuento, subtotal)),
    propinaPorcentaje,
    // la factura muestra exactamente lo que se cobró
    importesCobrados: { descuento: Math.max(0, descuento), propina: ticket.propina },
  };

  return {
    datos,
    idPedido: pedido.id_pedido,
    idTicket: ticket.id_ticket,
    idUsuario: pedido.id_usuario,
    numeroFactura,
    numeroMesa,
    correo,
    totalCobrado: ticket.total_final,
  };
}