import { computed, inject, Injectable, signal } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { SupabaseService } from '../supabase.service';

// Lo que se prepara en la cocina; las bebidas van al bar.
const TIPOS_COCINA = ['plato', 'postre'];

// Estados del pedido en los que la cocina puede recibirlo: ya lo aceptó
// el mozo ('confirmado') o el bar ya empezó con su parte ('en_preparacion').
const ESTADOS_PARA_COCINA = ['confirmado', 'en_preparacion'];

export interface ItemCocina {
  nombre: string;
  cantidad: number;
}

// null = todavía no lo recibió la cocina; 'en_preparacion' = ya lo tomó.
export type EstadoCocina = null | 'en_preparacion';

export interface PedidoCocina {
  idPedido: string;
  idUsuario: string;
  fecha: string;
  estadoCocina: EstadoCocina;
  items: ItemCocina[];
}

export interface MesaCocina {
  numeroMesa: string;
  pedidos: PedidoCocina[];
}

// Puntos 16 y 18: la cocina recibe los productos y avisa cuando los
// terminó. Lista los pedidos que el mozo ya confirmó y que la cocina
// todavía no terminó, agrupados por número de mesa. Los cambios de estado
// los hacen funciones de la base (ver supabase/sql/pedido_sectores.sql) y
// el cliente los ve en vivo (ver EstadoPedidoComponent).
@Injectable({ providedIn: 'root' })
export class Cocina {
  private _db = inject(SupabaseService);

  private _canal?: RealtimeChannel;

  private _pedidos = signal<(PedidoCocina & { numeroMesa: string })[]>([]);

  cargando = signal(false);

  // Mesas ordenadas por el pedido más viejo: lo que espera hace más
  // tiempo queda arriba.
  mesas = computed<MesaCocina[]>(() => {
    const porMesa = new Map<string, PedidoCocina[]>();

    for (const { numeroMesa, ...pedido } of this._pedidos()) {
      const lista = porMesa.get(numeroMesa) ?? [];
      lista.push(pedido);
      porMesa.set(numeroMesa, lista);
    }

    return [...porMesa.entries()].map(([numeroMesa, pedidos]) => ({
      numeroMesa,
      pedidos,
    }));
  });

  // Idempotente: si el canal ya existe, solo vuelve a cargar.
  async iniciar(): Promise<void> {
    if (!this._canal) {
      this.suscribir();
    }

    await this.cargar();
  }

  detener(): void {
    this._canal?.unsubscribe();
    this._canal = undefined;
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);

    try {
      const { data: pedidos, error } = await this._db.client
        .from('pedido')
        .select('id_pedido, id_mesa, id_usuario, fecha_emision_pedido, estado_cocina')
        .in('estado_pedido', ESTADOS_PARA_COCINA)
        .or('estado_cocina.is.null,estado_cocina.eq.en_preparacion')
        .order('fecha_emision_pedido', { ascending: true });

      if (error) {
        throw new Error('No pudimos cargar los pedidos.');
      }

      if (!pedidos || pedidos.length === 0) {
        this._pedidos.set([]);
        return;
      }

      const idsPedido = pedidos.map((p) => p.id_pedido);
      const idsMesa = [...new Set(pedidos.map((p) => p.id_mesa))];

      const [respuestaItems, respuestaMesas] = await Promise.all([
        this._db.client
          .from('pedido_item')
          .select('id_pedido, cantidad, carta(nombre, tipo)')
          .in('id_pedido', idsPedido),
        this._db.client.from('mesas').select('id, numero').in('id', idsMesa),
      ]);

      if (respuestaItems.error || respuestaMesas.error) {
        throw new Error('No pudimos cargar los pedidos.');
      }

      const numeroPorMesa = new Map<string, string>(
        (respuestaMesas.data ?? []).map((m) => [m.id, String(m.numero)])
      );

      const itemsPorPedido = new Map<string, ItemCocina[]>();

      for (const item of respuestaItems.data ?? []) {
        const carta = item.carta as unknown as { nombre: string; tipo: string } | null;

        if (!carta || !TIPOS_COCINA.includes(carta.tipo)) {
          continue;
        }

        const lista = itemsPorPedido.get(item.id_pedido) ?? [];
        lista.push({ nombre: carta.nombre, cantidad: item.cantidad });
        itemsPorPedido.set(item.id_pedido, lista);
      }

      // Un pedido que es solo de bebidas no tiene nada para la cocina.
      this._pedidos.set(
        pedidos
          .filter((p) => itemsPorPedido.has(p.id_pedido))
          .map((p) => ({
            idPedido: p.id_pedido,
            idUsuario: p.id_usuario,
            fecha: p.fecha_emision_pedido,
            estadoCocina: p.estado_cocina,
            numeroMesa: numeroPorMesa.get(p.id_mesa) ?? 'sin número',
            items: itemsPorPedido.get(p.id_pedido)!,
          }))
      );
    } finally {
      this.cargando.set(false);
    }
  }

  // Punto 16. Devuelve false si otro cocinero ya lo había recibido.
  async recibir(pedido: PedidoCocina): Promise<boolean> {
    const { data: recibido, error } = await this._db.client.rpc(
      'pedido_sector_recibir',
      { p_id_pedido: pedido.idPedido, p_sector: 'cocina' }
    );

    if (error) {
      throw new Error('No pudimos recibir el pedido.');
    }

    if (!recibido) {
      this.quitar(pedido.idPedido);
      return false;
    }

    this._pedidos.update((lista) =>
      lista.map((p) =>
        p.idPedido === pedido.idPedido ? { ...p, estadoCocina: 'en_preparacion' } : p
      )
    );

    this.avisarCliente(pedido, 'en_preparacion');

    return true;
  }

  // Punto 18. La cocina terminó su parte; devuelve true si con eso el
  // pedido quedó completo (el bar también terminó o no tenía bebidas).
  async entregar(pedido: PedidoCocina): Promise<boolean> {
    const { data: estado, error } = await this._db.client.rpc(
      'pedido_sector_listo',
      { p_id_pedido: pedido.idPedido, p_sector: 'cocina' }
    );

    if (error) {
      throw new Error('No pudimos marcar el pedido como listo.');
    }

    this.quitar(pedido.idPedido);

    if (estado !== 'listo') {
      return false;
    }

    // Los avisos no deben frenar a la cocina si fallan.
    this.avisarCliente(pedido, 'listo');
    void this._db.client.functions.invoke('notify-pedido-listo', {
      body: { idPedido: pedido.idPedido },
    });

    return true;
  }

  // Punto 16. La cocina no puede prepararlo: vuelve al cliente como
  // rechazado para que lo modifique. Devuelve false si ya no se podía
  // (otro cocinero lo recibió o el mozo lo cambió).
  async rechazar(pedido: PedidoCocina): Promise<boolean> {
    const { data: rechazado, error } = await this._db.client.rpc(
      'pedido_sector_rechazar',
      { p_id_pedido: pedido.idPedido, p_sector: 'cocina' }
    );

    if (error) {
      throw new Error('No pudimos rechazar el pedido.');
    }

    this.quitar(pedido.idPedido);

    if (rechazado) {
      this.avisarCliente(pedido, 'rechazado');
    }

    return !!rechazado;
  }

  // Deshace "Recibir" (por si se tocó por error): vuelve a "Por recibir".
  async devolver(pedido: PedidoCocina): Promise<boolean> {
    const { data: devuelto, error } = await this._db.client.rpc(
      'pedido_sector_devolver',
      { p_id_pedido: pedido.idPedido, p_sector: 'cocina' }
    );

    if (error) {
      throw new Error('No pudimos devolver el pedido.');
    }

    if (devuelto) {
      this._pedidos.update((lista) =>
        lista.map((p) => (p.idPedido === pedido.idPedido ? { ...p, estadoCocina: null } : p))
      );
    }

    return !!devuelto;
  }

  private quitar(idPedido: string): void {
    this._pedidos.update((lista) => lista.filter((p) => p.idPedido !== idPedido));
  }

  private avisarCliente(pedido: PedidoCocina, nuevoEstado: string): void {
    void this._db.client.functions.invoke('notify-pedido-stado', {
      body: { idUsuario: pedido.idUsuario, idPedido: pedido.idPedido, nuevoEstado },
    });
  }

  // Cualquier cambio en los pedidos (uno nuevo confirmado por el mozo, uno
  // recibido por otro cocinero) vuelve a armar el listado.
  private suscribir(): void {
    this._canal = this._db.client
      .channel('cocina-pedidos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedido' },
        () => void this.cargar().catch(() => undefined)
      )
      .subscribe();
  }
}
