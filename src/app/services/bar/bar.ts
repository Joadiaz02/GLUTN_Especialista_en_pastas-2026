import { computed, inject, Injectable, signal } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { SupabaseService } from '../supabase.service';

const TIPOS_BAR = ['bebida'];

const ESTADOS_PARA_BAR = ['confirmado', 'en_preparacion'];

export interface ItemBar {
  nombre: string;
  cantidad: number;
}

export type EstadoBar = null | 'en_preparacion';

export interface PedidoBar {
  idPedido: string;
  idUsuario: string;
  fecha: string;
  estadoBar: EstadoBar;
  items: ItemBar[];
}

export interface MesaBar {
  numeroMesa: string;
  pedidos: PedidoBar[];
}

@Injectable({ providedIn: 'root' })
export class Bar {
  private _db = inject(SupabaseService);

  private _canal?: RealtimeChannel;

  private _pedidos = signal<(PedidoBar & { numeroMesa: string })[]>([]);

  cargando = signal(false);

  mesas = computed<MesaBar[]>(() => {
    const porMesa = new Map<string, PedidoBar[]>();

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
        .select('id_pedido, id_mesa, id_usuario, fecha_emision_pedido, estado_bar')
        .in('estado_pedido', ESTADOS_PARA_BAR)
        .or('estado_bar.is.null,estado_bar.eq.en_preparacion')
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

      const itemsPorPedido = new Map<string, ItemBar[]>();

      for (const item of respuestaItems.data ?? []) {
        const carta = item.carta as unknown as { nombre: string; tipo: string } | null;

        if (!carta || !TIPOS_BAR.includes(carta.tipo)) {
          continue;
        }

        const lista = itemsPorPedido.get(item.id_pedido) ?? [];
        lista.push({ nombre: carta.nombre, cantidad: item.cantidad });
        itemsPorPedido.set(item.id_pedido, lista);
      }

      this._pedidos.set(
        pedidos
          .filter((p) => itemsPorPedido.has(p.id_pedido))
          .map((p) => ({
            idPedido: p.id_pedido,
            idUsuario: p.id_usuario,
            fecha: p.fecha_emision_pedido,
            estadoBar: p.estado_bar,
            numeroMesa: numeroPorMesa.get(p.id_mesa) ?? 'sin número',
            items: itemsPorPedido.get(p.id_pedido)!,
          }))
      );
    } finally {
      this.cargando.set(false);
    }
  }

  async recibir(pedido: PedidoBar): Promise<boolean> {
    const { data: recibido, error } = await this._db.client.rpc(
      'pedido_sector_recibir',
      { p_id_pedido: pedido.idPedido, p_sector: 'bar' }
    );

    if (error) throw new Error('No pudimos recibir el pedido.');

    if (!recibido) {
      this.quitar(pedido.idPedido);
      return false;
    }

    this._pedidos.update((lista) =>
      lista.map((p) =>
        p.idPedido === pedido.idPedido ? { ...p, estadoBar: 'en_preparacion' } : p
      )
    );

    this.avisarCliente(pedido, 'en_preparacion');
    return true;
  }

  async entregar(pedido: PedidoBar): Promise<boolean> {
    const { data: estado, error } = await this._db.client.rpc(
      'pedido_sector_listo',
      { p_id_pedido: pedido.idPedido, p_sector: 'bar' }
    );

    if (error) throw new Error('No pudimos marcar el pedido como listo.');

    this.quitar(pedido.idPedido);

    if (estado !== 'listo') return false;

    this.avisarCliente(pedido, 'listo');
    void this._db.client.functions.invoke('notify-pedido-listo', {
      body: { idPedido: pedido.idPedido },
    });

    return true;
  }

  async rechazar(pedido: PedidoBar): Promise<boolean> {
    const { data: rechazado, error } = await this._db.client.rpc(
      'pedido_sector_rechazar',
      { p_id_pedido: pedido.idPedido, p_sector: 'bar' }
    );

    if (error) throw new Error('No pudimos rechazar el pedido.');

    this.quitar(pedido.idPedido);

    if (rechazado) {
      this.avisarCliente(pedido, 'rechazado');
    }

    return !!rechazado;
  }

  async devolver(pedido: PedidoBar): Promise<boolean> {
    const { data: devuelto, error } = await this._db.client.rpc(
      'pedido_sector_devolver',
      { p_id_pedido: pedido.idPedido, p_sector: 'bar' }
    );

    if (error) throw new Error('No pudimos devolver el pedido.');

    if (devuelto) {
      this._pedidos.update((lista) =>
        lista.map((p) => (p.idPedido === pedido.idPedido ? { ...p, estadoBar: null } : p))
      );
    }

    return !!devuelto;
  }

  private quitar(idPedido: string): void {
    this._pedidos.update((lista) => lista.filter((p) => p.idPedido !== idPedido));
  }

  private avisarCliente(pedido: PedidoBar, nuevoEstado: string): void {
    void this._db.client.functions.invoke('notify-pedido-stado', {
      body: { idUsuario: pedido.idUsuario, idPedido: pedido.idPedido, nuevoEstado },
    });
  }

  private suscribir(): void {
    this._canal = this._db.client
      .channel('bar-pedidos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedido' },
        () => void this.cargar().catch(() => undefined)
      )
      .subscribe();
  }
}