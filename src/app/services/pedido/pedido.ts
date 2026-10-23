import { effect, inject, Injectable, signal, untracked } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { Carrito } from '@app/pages/carrito/carrito';
import { MesaCliente } from '../mesa-cliente/mesa-cliente';

// Interfaz sin propina_porcentaje (ya que la propina va directo al ticket)
export interface CuentaCliente {
  estado: 'cuenta_entregada' | 'pago_realizado';
  idMesa: string;
  idsPedidos: string[];
  lineas: {
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    importe: number;
  }[];
}

@Injectable({
    providedIn: 'root'
})
export class Pedido {
    private sup = inject(SupabaseService);
    private carrito = inject(Carrito);
    public estado_pedido = signal<boolean>(false);
    public idUltimoPedido = signal<string | null>(null);
    public idPedidoEnEdicion = signal<string | null>(null);
    private mesaCliente = inject(MesaCliente);

    constructor() {
        // al entrar o cambiar de mesa recupera el pedido de la estadía
        effect(() => {
            const idMesa = this.mesaCliente.id();
            const desde = this.mesaCliente.desde();
            untracked(() => void this.recuperarPedidoActual(idMesa, desde));
        });
    }

    // último pedido del cliente en su mesa desde que se anotó
    private async recuperarPedidoActual(idMesa: string | null, desde: string | null): Promise<void> {
        if (!idMesa || !desde) {
            this.idUltimoPedido.set(null);
            return;
        }

        const { data: sesion } = await this.sup.client.auth.getSession();
        const idUsuario = sesion.session?.user.id;

        if (!idUsuario) return;

        const { data, error } = await this.sup.client
            .from('pedido')
            .select('id_pedido')
            .eq('id_usuario', idUsuario)
            .eq('id_mesa', idMesa)
            .gte('fecha_emision_pedido', desde)
            .order('fecha_emision_pedido', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error || this.mesaCliente.id() !== idMesa) return;

        if (data?.id_pedido) {
            this.idUltimoPedido.set(data.id_pedido);
        }
    }

    async crear_pedido(id_mesa: string, id_usuario: string, detalles: string): Promise<string> {
        const item = this.carrito.items();

        if (item.length === 0) {
            throw new Error('El carrito está vacío');
        }
        const { data: pedido, error: error } = await this.sup.client.from('pedido').insert({
            id_mesa: id_mesa,
            id_usuario: id_usuario,
            detalles,
            subtotal: this.carrito.importeTotal(),
            estado_pedido: 'Pendiente'
        }).select().single();

        if (error) {
            throw error;
        }

        const itemsAInsertar = item.map(item => ({
            id_pedido: pedido.id_pedido,
            id_carta: item.producto.id_carta,
            cantidad: item.cantidad,
            precio_unitario: item.producto.precio,
            subtotal: item.producto.precio * item.cantidad
        }));

        const { error: error_items } = await this.sup.client.from('pedido_item').insert(itemsAInsertar);

        if (error_items) {
            await this.sup.client.from('pedido').delete().eq('id_pedido', pedido.id_pedido);
            throw error_items;
        };

        this.sup.client.functions.invoke('notify-new-pedido', {
            body: { idPedido: pedido.id_pedido, idMesa: id_mesa }
        }).then(({ error: errorAviso }) => {
            if (errorAviso) {
                console.log('No se pudo avisar al mozo del pedido nuevo:', errorAviso);
            }
        });

        this.carrito.vaciar();
        this.estado_pedido.set(true);
        this.idUltimoPedido.set(pedido.id_pedido);
        return pedido.id_pedido;
    }

    async traer_pedido(): Promise<any[]> {
        const { data, error } = await this.sup.client.from('pedido').select('*').eq('estado_pedido', 'Pendiente').order('fecha_emision_pedido', { ascending: true });

        if (error) throw error;   
        if (!data) throw new Error('Pedido no encontrado');
        
        return data ?? [];
    }

    async obtenerPedidoConItems(idPedido: string): Promise<any> {
      const { data: pedido, error: errorPedido } = await this.sup.client
        .from('pedido')
        .select('*, mesas(numero), usuarios:id_usuario(nombre, apellido)')
        .eq('id_pedido', idPedido)
        .single();

      if (errorPedido) throw errorPedido;

      const { data: items, error: errorItems } = await this.sup.client
        .from('pedido_item')
        .select('*, carta(*)')
        .eq('id_pedido', idPedido);

      if (errorItems) throw errorItems;

      return { ...pedido, items: items ?? [] };
    }

    async actualizarEstado(idPedido: string, idUsuario: string, nuevoEstado: string): Promise<void> {
      const { data: pedidoActualizado, error } = await this.sup.client
        .from('pedido')
        .update({ estado_pedido: nuevoEstado })
        .eq('id_pedido', idPedido)
        .select()
        .single();

      if (error) throw error;
      if (!pedidoActualizado) throw new Error('Pedido no encontrado');

      await this.sup.client.functions.invoke('notify-pedido-stado', {
        body: { idUsuario, idPedido, nuevoEstado }
      });

      if (nuevoEstado === 'confirmado') {
        await this.sup.client.functions.invoke('notify-kitchen-bar', {
          body: { idPedido, idMesa: pedidoActualizado.id_mesa }
        });
      }
    }

    async actualizar_pedido(id_pedido: string): Promise<void> {
      const items = this.carrito.items();

      if (items.length === 0) {
        throw new Error('El carrito está vacío');
      }

      const { data: borrados, error: errorBorrar } = await this.sup.client.from('pedido_item').delete().eq('id_pedido', id_pedido).select('id_pedido');
      if (errorBorrar) throw errorBorrar;

      if (!borrados || borrados.length === 0) {
        throw new Error('No se pudieron reemplazar los productos del pedido.');
      }

      const itemsAInsertar = items.map(item => ({
        id_pedido: id_pedido,
        id_carta: item.producto.id_carta,
        cantidad: item.cantidad,
        precio_unitario: item.producto.precio,
        subtotal: item.producto.precio * item.cantidad
      }));

      const { error: error_items } = await this.sup.client.from('pedido_item').insert(itemsAInsertar);
      if (error_items) throw error_items;

      const { data: pedidoActualizado, error: error_modificacion } = await this.sup.client
        .from('pedido')
        .update({ subtotal: this.carrito.importeTotal(), estado_pedido: 'Pendiente' })
        .eq('id_pedido', id_pedido)
        .select()
        .single();

      if (error_modificacion) throw error_modificacion;

      await this.sup.client.functions.invoke('notify-new-pedido', {
        body: { idPedido: id_pedido, idMesa: pedidoActualizado.id_mesa }
      });

      this.carrito.vaciar();
      this.idPedidoEnEdicion.set(null);
      this.idUltimoPedido.set(id_pedido);
    }

    async obtenerPedidosConfirmados(): Promise<any[]> {
      const { data, error } = await this.sup.client
        .from('pedido')
        .select('*, pedido_item(*, carta(*))')
        .eq('estado_pedido', 'confirmado')
        .order('fecha_emision_pedido', { ascending: true });

      if (error) throw error;
      return data ?? [];
    }

    async confirmarRecepcion(idPedido: string): Promise<void> {
      const { data, error } = await this.sup.client
        .from('pedido')
        .update({ estado_pedido: 'recibido' })
        .eq('id_pedido', idPedido)
        .eq('estado_pedido', 'entregado')
        .select('id_pedido');

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('No pudimos confirmar la recepción.');
      }
    }

    // OBTENER CUENTA (Sin propina_porcentaje)
    async obtenerCuenta(idUsuario: string): Promise<CuentaCliente | null> {
      const { data: pedidos, error } = await this.sup.client
        .from('pedido')
        .select('id_pedido, id_mesa, estado_pedido') // <-- Eliminado propina_porcentaje
        .eq('id_usuario', idUsuario)
        .in('estado_pedido', ['cuenta_entregada', 'pago_realizado'])
        .order('fecha_emision_pedido', { ascending: true });

      if (error) throw new Error('No pudimos cargar tu cuenta.');
      if (!pedidos || pedidos.length === 0) return null;

      const ids: string[] = [];
      for (const p of pedidos) {
        ids.push(p.id_pedido);
      }

      const { data: items, error: errorItems } = await this.sup.client
        .from('pedido_item')
        .select('cantidad, precio_unitario, subtotal, carta(nombre)')
        .in('id_pedido', ids);

      if (errorItems) throw new Error('No pudimos cargar tu cuenta.');

      const lineas: CuentaCliente['lineas'] = [];
      for (const item of items ?? []) {
        const carta = item.carta as unknown as { nombre: string } | null;
        lineas.push({
          nombre: carta?.nombre ?? 'Producto',
          cantidad: item.cantidad,
          precioUnitario: item.precio_unitario,
          importe: item.subtotal,
        });
      }

      return {
        estado: pedidos[0].estado_pedido as CuentaCliente['estado'],
        idMesa: pedidos[0].id_mesa,
        idsPedidos: ids,
        lineas, 
      };
    }

    // PAGAR CUENTA (Guarda la propina directamente en el ticket)
    async pagarCuenta(datos: {
      idMesa: string;
      idsPedidos: string[];
      propinaImporte: number;
      totalFinal: number;
    }): Promise<void> {
      const { error: errorTicket } = await this.sup.client.from('ticket').insert({
        id_pedido: datos.idsPedidos[0],
        propina: datos.propinaImporte,
        total_final: datos.totalFinal,
      });

      if (errorTicket) throw new Error('No pudimos registrar el pago.');

      const { data, error } = await this.sup.client
        .from('pedido')
        .update({ estado_pedido: 'pago_realizado' })
        .in('id_pedido', datos.idsPedidos)
        .eq('estado_pedido', 'cuenta_entregada')
        .select('id_pedido');

      if (error || !data || data.length === 0) {
        await this.sup.client.from('ticket').delete().eq('id_pedido', datos.idsPedidos[0]);
        throw new Error('No pudimos registrar el pago.');
      }

      void this.sup.client.functions.invoke('notify-pago', {
        body: { idMesa: datos.idMesa, evento: 'realizado' },
      });
    }

    // SOLICITAR CUENTA (Sin propina_porcentaje en la tabla pedido)
    async solicitarCuenta(idUsuario: string, porcentaje: number): Promise<void> {
      // Nota: Si necesitás guardar el porcentaje del QR temporalmente, asegurate de manejarlo 
      // en la lógica local o pasarlo al ticket al pagar, ya que la tabla pedido no tiene esa columna.
      const { data, error } = await this.sup.client
        .from('pedido')
        .update({ estado_pedido: 'cuenta_solicitada' }) // <-- Eliminado propina_porcentaje: porcentaje
        .eq('id_usuario', idUsuario)
        .eq('estado_pedido', 'recibido')
        .select('id_pedido, id_mesa');

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('Primero confirmá que recibiste tu pedido.');
      }

      void this.sup.client.functions.invoke('notify-cuenta-solicitada', {
        body: { idPedido: data[0].id_pedido, idMesa: data[0].id_mesa },
      });
    }
}