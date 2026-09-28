import { inject, Injectable, signal } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';

import type { TipoCarta } from '../../models/carta.model';
import { SupabaseService } from '../supabase.service';

export interface ItemListo {
  nombre: string;
  cantidad: number;
  tipo: TipoCarta;
}

export interface PedidoListo {
  idPedido: string;
  numeroMesa: string;
  fecha: string;
  items: ItemListo[];
}

// Orden en que el mozo lleva las cosas a la mesa.
const ORDEN_TIPOS: TipoCarta[] = ['plato', 'bebida', 'postre'];

// Punto 18: el mozo ve los pedidos completos (cocina y bar terminaron su
// parte, ver supabase/sql/pedido_sectores.sql) para llevarlos a la mesa.
// Se actualiza en vivo: cuando un pedido pasa a 'listo' aparece solo, y
// cuando se entrega (punto 19) desaparece.
@Injectable({ providedIn: 'root' })
export class PedidosListos {
  private _db = inject(SupabaseService);

  private _canal?: RealtimeChannel;

  pedidos = signal<PedidoListo[]>([]);
  cargando = signal(false);

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
        .select('id_pedido, id_mesa, fecha_emision_pedido')
        .eq('estado_pedido', 'listo')
        .order('fecha_emision_pedido', { ascending: true });

      if (error) {
        throw new Error('No pudimos cargar los pedidos listos.');
      }

      if (!pedidos || pedidos.length === 0) {
        this.pedidos.set([]);
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
        throw new Error('No pudimos cargar los pedidos listos.');
      }

      const numeroPorMesa = new Map<string, string>(
        (respuestaMesas.data ?? []).map((m) => [m.id, String(m.numero)])
      );

      const itemsPorPedido = new Map<string, ItemListo[]>();

      for (const item of respuestaItems.data ?? []) {
        const carta = item.carta as unknown as { nombre: string; tipo: TipoCarta } | null;

        if (!carta) {
          continue;
        }

        const lista = itemsPorPedido.get(item.id_pedido) ?? [];
        lista.push({ nombre: carta.nombre, cantidad: item.cantidad, tipo: carta.tipo });
        itemsPorPedido.set(item.id_pedido, lista);
      }

      const pedidosListos = pedidos.map((p) => ({
        idPedido: p.id_pedido,
        numeroMesa: numeroPorMesa.get(p.id_mesa) ?? 'sin número',
        fecha: p.fecha_emision_pedido,
        items: (itemsPorPedido.get(p.id_pedido) ?? []).sort(
          (a, b) => ORDEN_TIPOS.indexOf(a.tipo) - ORDEN_TIPOS.indexOf(b.tipo)
        ),
      }));

      // Los de una misma mesa quedan juntos; las mesas, por el pedido que
      // está esperando hace más tiempo.
      const ordenMesas = [...new Set(pedidosListos.map((p) => p.numeroMesa))];

      this.pedidos.set(
        pedidosListos.sort(
          (a, b) => ordenMesas.indexOf(a.numeroMesa) - ordenMesas.indexOf(b.numeroMesa)
        )
      );
    } finally {
      this.cargando.set(false);
    }
  }

  private suscribir(): void {
    this._canal = this._db.client
      .channel('pedidos-listos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedido' },
        () => void this.cargar().catch(() => undefined)
      )
      .subscribe();
  }
}
