
import { computed, inject, Injectable, signal } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { SupabaseService } from '../supabase.service';

export type EstadoCuenta =
  | 'cuenta_solicitada'
  | 'cuenta_entregada'
  | 'pago_realizado';

export interface ProductoCuenta {
  idItem: string;
  idCarta: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface CuentaDelMozo {
  idPedido: string;
  idPedidos: string[];
  idUsuario: string;
  idMesa: string;
  numeroMesa: string;
  estado: EstadoCuenta;
  subtotal: number;
  propina: number | null;
  totalFinal: number | null;
  productos: ProductoCuenta[];
}

@Injectable({ providedIn: 'root' })
export class CuentasMozo {
  private _db = inject(SupabaseService);
  private _canal?: RealtimeChannel;

  cuentas = signal<CuentaDelMozo[]>([]);
  cargando = signal(false);

  cuentasPedidas = computed(() =>
    this.cuentas().filter((cuenta) => cuenta.estado !== 'pago_realizado')
  );

  pagos = computed(() =>
    this.cuentas().filter((cuenta) => cuenta.estado === 'pago_realizado')
  );

  async iniciar(): Promise<void> {
    if (!this._canal) {
      this.suscribir();
    }

    await this.cargar();
  }

  detener(): void {
    if (this._canal) {
      void this._db.client.removeChannel(this._canal);
      this._canal = undefined;
    }
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);

    try {
      const { data: pedidos, error } = await this._db.client
        .from('pedido')
        .select(
          'id_pedido, id_mesa, id_usuario, subtotal, estado_pedido'
        )
        .in('estado_pedido', [
          'cuenta_solicitada',
          'cuenta_entregada',
          'pago_realizado',
        ])
        .order('fecha_emision_pedido', { ascending: true });

      if (error) {
        throw new Error('No pudimos cargar las cuentas.');
      }

      if (!pedidos || pedidos.length === 0) {
        this.cuentas.set([]);
        return;
      }

      // Agrupamos por cliente y mesa, no solamente por cliente.
      const grupos = new Map<string, any>();

      for (const pedido of pedidos) {
        const clave = `${pedido.id_usuario}_${pedido.id_mesa}`;
        const grupo = grupos.get(clave);

        if (grupo) {
          grupo.idPedidos.push(pedido.id_pedido);
          grupo.subtotal += Number(pedido.subtotal ?? 0);
          grupo.estados.push(pedido.estado_pedido);
        } else {
          grupos.set(clave, {
            idPedido: pedido.id_pedido,
            idPedidos: [pedido.id_pedido],
            idUsuario: pedido.id_usuario,
            idMesa: pedido.id_mesa,
            numeroMesa: 'Sin número',
            estado: pedido.estado_pedido,
            estados: [pedido.estado_pedido],
            subtotal: Number(pedido.subtotal ?? 0),
            propina: null,
            totalFinal: null,
            productos: [],
          });
        }
      }

      const cuentas = Array.from(grupos.values());

      // Recuperamos los números de mesa.
      const idsMesa = Array.from(
        new Set(cuentas.map((cuenta) => cuenta.idMesa))
      );

      const todosLosPedidos = pedidos.map((pedido) => pedido.id_pedido);

      const idsPedidosConTicket = pedidos
        .filter(
          (pedido) =>
            pedido.estado_pedido === 'cuenta_entregada' ||
            pedido.estado_pedido === 'pago_realizado'
        )
        .map((pedido) => pedido.id_pedido);

      const [
        respuestaMesas,
        respuestaItems,
        respuestaTickets,
      ] = await Promise.all([
        this._db.client
          .from('mesas')
          .select('id, numero')
          .in('id', idsMesa),

        this._db.client
          .from('pedido_item')
          .select(
            'id_item, id_pedido, id_carta, cantidad, precio_unitario, subtotal'
          )
          .in('id_pedido', todosLosPedidos),

        idsPedidosConTicket.length > 0
          ? this._db.client
              .from('ticket')
              .select('id_pedido, propina, total_final')
              .in('id_pedido', idsPedidosConTicket)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (respuestaMesas.error) {
        throw new Error('No pudimos obtener los números de mesa.');
      }

      if (respuestaItems.error) {
        throw new Error('No pudimos cargar los productos de las cuentas.');
      }

      if (respuestaTickets.error) {
        throw new Error('No pudimos cargar los tickets.');
      }

      // Buscamos los nombres de los productos en la carta.
      const idsCarta = Array.from(
        new Set(
          (respuestaItems.data ?? []).map((item) => item.id_carta)
        )
      );

      const respuestaCarta =
        idsCarta.length > 0
          ? await this._db.client
              .from('carta')
              .select('id_carta, nombre')
              .in('id_carta', idsCarta)
          : { data: [], error: null };

      if (respuestaCarta.error) {
        throw new Error('No pudimos obtener los nombres de los productos.');
      }

      const numeroPorMesa = new Map<string, string>();

      for (const mesa of respuestaMesas.data ?? []) {
        numeroPorMesa.set(mesa.id, String(mesa.numero));
      }

      const nombrePorCarta = new Map<string, string>();

      for (const producto of respuestaCarta.data ?? []) {
        nombrePorCarta.set(producto.id_carta, producto.nombre);
      }

      const ticketsPorPedido = new Map<
        string,
        { propina: number; totalFinal: number }
      >();

      for (const ticket of respuestaTickets.data ?? []) {
        ticketsPorPedido.set(ticket.id_pedido, {
          propina: Number(ticket.propina ?? 0),
          totalFinal: Number(ticket.total_final ?? 0),
        });
      }

      const itemsPorPedido = new Map<string, ProductoCuenta[]>();

      for (const item of respuestaItems.data ?? []) {
        const productos = itemsPorPedido.get(item.id_pedido) ?? [];

        productos.push({
          idItem: item.id_item,
          idCarta: item.id_carta,
          nombre: nombrePorCarta.get(item.id_carta) ?? 'Producto sin nombre',
          cantidad: Number(item.cantidad ?? 0),
          precioUnitario: Number(item.precio_unitario ?? 0),
          subtotal: Number(item.subtotal ?? 0),
        });

        itemsPorPedido.set(item.id_pedido, productos);
      }

      // Completamos cada cuenta con sus productos, mesa y tickets.
      for (const cuenta of cuentas) {
        cuenta.numeroMesa =
          numeroPorMesa.get(cuenta.idMesa) ?? 'Sin número';

        // La cuenta solamente se considera pagada cuando todos sus pedidos
        // están en estado pago_realizado.
        if (cuenta.estados.every(
          (estado: EstadoCuenta) => estado === 'pago_realizado'
        )) {
          cuenta.estado = 'pago_realizado';
        } else if (
          cuenta.estados.some(
            (estado: EstadoCuenta) => estado === 'cuenta_solicitada'
          )
        ) {
          cuenta.estado = 'cuenta_solicitada';
        } else {
          cuenta.estado = 'cuenta_entregada';
        }

        cuenta.productos = cuenta.idPedidos.flatMap(
          (idPedido: string) => itemsPorPedido.get(idPedido) ?? []
        );

        const tickets = cuenta.idPedidos
          .map((idPedido: string) => ticketsPorPedido.get(idPedido))
          .filter(
            (
              ticket: { propina: number; totalFinal: number } | undefined
            ): ticket is { propina: number; totalFinal: number } =>
              ticket !== undefined
          );

        if (tickets.length > 0) {
          cuenta.propina = tickets.reduce(
            (total: number, ticket: { propina: number }) =>
              total + ticket.propina,
            0
          );

          cuenta.totalFinal = tickets.reduce(
            (total: number, ticket: { totalFinal: number }) =>
              total + ticket.totalFinal,
            0
          );
        }
      }

      this.cuentas.set(cuentas as CuentaDelMozo[]);
    } finally {
      this.cargando.set(false);
    }
  }

  // El mozo entrega la cuenta de un cliente en una mesa determinada.
  async entregarCuenta(cuenta: CuentaDelMozo): Promise<void> {
    const { data, error } = await this._db.client
      .from('pedido')
      .update({ estado_pedido: 'cuenta_entregada' })
      .eq('id_usuario', cuenta.idUsuario)
      .eq('id_mesa', cuenta.idMesa)
      .eq('estado_pedido', 'cuenta_solicitada')
      .select('id_pedido');

    if (error || !data || data.length === 0) {
      throw new Error('No pudimos entregar la cuenta.');
    }

    for (const pedido of data) {
      void this._db.client.functions.invoke('notify-pedido-stado', {
        body: {
          idUsuario: cuenta.idUsuario,
          idPedido: pedido.id_pedido,
          nuevoEstado: 'cuenta_entregada',
        },
      });
    }
  }

  // Confirma todos los pedidos pagados del mismo cliente y de la misma mesa.
  async confirmarPago(cuenta: CuentaDelMozo): Promise<void> {
    const { data: confirmado, error } = await this._db.client.rpc(
      'pedido_confirmar_pago',
      {
        p_id_pedido: cuenta.idPedido,
      }
    );

    if (error) {
      throw new Error('No pudimos confirmar el pago.');
    }

    if (!confirmado) {
      throw new Error('Este pago ya no se puede confirmar.');
    }

    for (const idPedido of cuenta.idPedidos) {
      void this._db.client.functions.invoke('notify-pedido-stado', {
        body: {
          idUsuario: cuenta.idUsuario,
          idPedido,
          nuevoEstado: 'pagado',
        },
      });

      void this._db.client.functions.invoke('enviar-factura', {
        body: { idPedido },
      });
    }

    void this._db.client.functions.invoke('notify-pago', {
      body: {
        idMesa: cuenta.idMesa,
        idPedido: cuenta.idPedido,
        evento: 'confirmado',
      },
    });
  }

  private suscribir(): void {
    this._canal = this._db.client
      .channel('cuentas-del-mozo')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedido' },
        () => void this.cargar().catch(() => undefined)
      )
      .subscribe();
  }
}
