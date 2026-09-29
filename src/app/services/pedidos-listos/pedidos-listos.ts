import { computed, inject, Injectable, signal } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';

import type { TipoCarta } from '../../models/carta.model';
import { SupabaseService } from '../supabase.service';

export type SectorPedido = 'cocina' | 'bar';

// Cómo va cada parte del pedido en su sector.
export type EstadoParte = 'por_recibir' | 'en_preparacion' | 'listo';

export interface ItemPedido {
  nombre: string;
  cantidad: number;
  tipo: TipoCarta;
}

// La parte del pedido que prepara un sector (platos y postres en la
// cocina, bebidas en el bar).
export interface ParteDelPedido {
  sector: SectorPedido;
  estado: EstadoParte;
  items: ItemPedido[];
}

export interface PedidoDelMozo {
  idPedido: string;
  numeroMesa: string;
  fecha: string;
  completo: boolean;
  partes: ParteDelPedido[];
}

const SECTOR_POR_TIPO: Record<TipoCarta, SectorPedido> = {
  plato: 'cocina',
  postre: 'cocina',
  bebida: 'bar',
};

// Orden en que se muestran los ítems dentro de la cocina.
const ORDEN_TIPOS: TipoCarta[] = ['plato', 'postre', 'bebida'];

// Punto 18: el mozo ve, en su listado de pedidos pendientes, cómo va cada
// parte del pedido (cocina y bar), y cuándo está completo para llevarlo a
// la mesa (solo cuando terminaron todos los sectores que intervienen, ver
// supabase/sql/pedido_sectores.sql). Se actualiza en vivo.
@Injectable({ providedIn: 'root' })
export class PedidosListos {
  private _db = inject(SupabaseService);

  private _canal?: RealtimeChannel;

  pedidos = signal<PedidoDelMozo[]>([]);
  cargando = signal(false);

  completos = computed(() => this.pedidos().filter((p) => p.completo));
  enPreparacion = computed(() => this.pedidos().filter((p) => !p.completo));

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
        .select('id_pedido, id_mesa, fecha_emision_pedido, estado_pedido, estado_cocina, estado_bar')
        .in('estado_pedido', ['confirmado', 'en_preparacion', 'listo'])
        .order('fecha_emision_pedido', { ascending: true });

      if (error) {
        throw new Error('No pudimos cargar los pedidos.');
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
        throw new Error('No pudimos cargar los pedidos.');
      }

      const numeroPorMesa = new Map<string, string>(
        (respuestaMesas.data ?? []).map((m) => [m.id, String(m.numero)])
      );

      const itemsPorPedido = new Map<string, ItemPedido[]>();

      for (const item of respuestaItems.data ?? []) {
        const carta = item.carta as unknown as { nombre: string; tipo: TipoCarta } | null;

        if (!carta) {
          continue;
        }

        const lista = itemsPorPedido.get(item.id_pedido) ?? [];
        lista.push({ nombre: carta.nombre, cantidad: item.cantidad, tipo: carta.tipo });
        itemsPorPedido.set(item.id_pedido, lista);
      }

      const lista = pedidos.map((p) => {
        const items = (itemsPorPedido.get(p.id_pedido) ?? []).sort(
          (a, b) => ORDEN_TIPOS.indexOf(a.tipo) - ORDEN_TIPOS.indexOf(b.tipo)
        );

        return {
          idPedido: p.id_pedido,
          numeroMesa: numeroPorMesa.get(p.id_mesa) ?? 'sin número',
          fecha: p.fecha_emision_pedido,
          completo: p.estado_pedido === 'listo',
          partes: this.armarPartes(items, p.estado_cocina, p.estado_bar),
        };
      });

      // Los de una misma mesa quedan juntos; las mesas, por el pedido que
      // está esperando hace más tiempo.
      const ordenMesas = [...new Set(lista.map((p) => p.numeroMesa))];

      this.pedidos.set(
        lista.sort(
          (a, b) => ordenMesas.indexOf(a.numeroMesa) - ordenMesas.indexOf(b.numeroMesa)
        )
      );
    } finally {
      this.cargando.set(false);
    }
  }

  // Solo aparecen los sectores que tienen algo para preparar.
  private armarPartes(
    items: ItemPedido[],
    estadoCocina: string | null,
    estadoBar: string | null
  ): ParteDelPedido[] {
    const partes: ParteDelPedido[] = [];

    for (const sector of ['cocina', 'bar'] as SectorPedido[]) {
      const delSector = items.filter((item) => SECTOR_POR_TIPO[item.tipo] === sector);

      if (delSector.length === 0) {
        continue;
      }

      const estado = sector === 'cocina' ? estadoCocina : estadoBar;

      partes.push({
        sector,
        estado: estado === 'listo' || estado === 'en_preparacion' ? estado : 'por_recibir',
        items: delSector,
      });
    }

    return partes;
  }

  private suscribir(): void {
    this._canal = this._db.client
      .channel('pedidos-del-mozo')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedido' },
        () => void this.cargar().catch(() => undefined)
      )
      .subscribe();
  }
}
