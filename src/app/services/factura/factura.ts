import { inject, Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

import { SupabaseService } from '../supabase.service';

export interface FacturaCliente {
  idTicket: string;
  idPedido: string;
  fecha: string;
  total: number;
}

export interface FacturaDelRestaurante extends FacturaCliente {
  cliente: string;
  anonimo: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class Factura {
  private _db = inject(SupabaseService);

  // tickets de los pedidos pagados del cliente, de la más nueva a la más vieja
  async listar(idUsuario: string): Promise<FacturaCliente[]> {
    const { data: pedidos, error } = await this._db.client
      .from('pedido')
      .select('id_pedido')
      .eq('id_usuario', idUsuario)
      .eq('estado_pedido', 'pagado');

    if (error) throw new Error('No pudimos cargar tus facturas.');
    if (!pedidos || pedidos.length === 0) return [];

    const { data: tickets, error: errorTickets } = await this._db.client
      .from('ticket')
      .select('id_ticket, id_pedido, total_final, fecha_emision_ticket')
      .in('id_pedido', pedidos.map((p) => p.id_pedido))
      .order('fecha_emision_ticket', { ascending: false });

    if (errorTickets) throw new Error('No pudimos cargar tus facturas.');

    return (tickets ?? []).map((t) => ({
      idTicket: t.id_ticket,
      idPedido: t.id_pedido,
      fecha: t.fecha_emision_ticket,
      total: t.total_final,
    }));
  }

  // todas las facturas de un día, para el dueño y el supervisor
  async listarDelDia(dia: Date): Promise<FacturaDelRestaurante[]> {
    const desde = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate());
    const hasta = new Date(desde);
    hasta.setDate(hasta.getDate() + 1);

    const { data: tickets, error } = await this._db.client
      .from('ticket')
      .select('id_ticket, id_pedido, total_final, fecha_emision_ticket')
      .gte('fecha_emision_ticket', desde.toISOString())
      .lt('fecha_emision_ticket', hasta.toISOString())
      .order('fecha_emision_ticket', { ascending: false });

    if (error) throw new Error('No pudimos cargar las facturas.');
    if (!tickets || tickets.length === 0) return [];

    const { data: pedidos, error: errorPedidos } = await this._db.client
      .from('pedido')
      .select('id_pedido, id_usuario')
      .in('id_pedido', tickets.map((t) => t.id_pedido));

    if (errorPedidos) throw new Error('No pudimos cargar las facturas.');

    const usuarioPorPedido = new Map((pedidos ?? []).map((p) => [p.id_pedido, p.id_usuario]));

    const { data: clientes, error: errorClientes } = await this._db.client
      .from('usuarios')
      .select('id, nombre, apellido, perfil')
      .in('id', [...new Set(usuarioPorPedido.values())]);

    if (errorClientes) throw new Error('No pudimos cargar las facturas.');

    const clientePorId = new Map((clientes ?? []).map((c) => [c.id, c]));

    return tickets.map((t) => {
      const cliente = clientePorId.get(usuarioPorPedido.get(t.id_pedido) ?? '');
      const anonimo = cliente?.perfil === 'cliente_anonimo';

      return {
        idTicket: t.id_ticket,
        idPedido: t.id_pedido,
        fecha: t.fecha_emision_ticket,
        total: t.total_final,
        cliente: cliente
          ? [cliente.nombre, anonimo ? null : cliente.apellido].filter(Boolean).join(' ')
          : 'Cliente',
        anonimo,
      };
    });
  }

  // la factura se arma en el servidor con los datos del ticket; no queda guardada en Supabase
  async descargar(idPedido: string): Promise<void> {
    const { data, error } = await this._db.client.functions.invoke('factura', {
      body: { idPedido },
    });

    if (error || !(data instanceof Blob)) {
      throw new Error('No pudimos generar la factura.');
    }

    const nombreArchivo = `factura-glutn-${idPedido.slice(0, 8)}.pdf`;

    if (Capacitor.isNativePlatform()) {
      const { uri } = await Filesystem.writeFile({
        path: nombreArchivo,
        data: await this.aBase64(data),
        directory: Directory.Cache,
      });

      await Share.share({
        title: 'Factura GLUTN',
        url: uri,
        dialogTitle: 'Guardar factura',
      });
    } else {
      const url = URL.createObjectURL(data);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = nombreArchivo;
      enlace.click();
      URL.revokeObjectURL(url);
    }
  }

  private aBase64(archivo: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(String(lector.result).split(',')[1]);
      lector.onerror = () => reject(lector.error);
      lector.readAsDataURL(archivo);
    });
  }
}
