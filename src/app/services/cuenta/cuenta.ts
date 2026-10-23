import { computed, inject, Injectable, signal } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { SupabaseService } from '../supabase.service';

export type EstadoCuenta = 'cuenta_solicitada' | 'cuenta_entregada' | 'pago_realizado';

export interface CuentaDelMozo {
  idPedido: string;
  idUsuario: string;
  idMesa: string;
  numeroMesa: string;
  estado: EstadoCuenta;
  subtotal: number;
  propinaPorcentaje: number | null;
  totalFinal: number | null;
}

// cuentas de los clientes: pedidas, entregadas y pagadas
@Injectable({ providedIn: 'root' })
export class CuentasMozo {
  private _db = inject(SupabaseService);

  private _canal?: RealtimeChannel;

  cuentas = signal<CuentaDelMozo[]>([]);
  cargando = signal(false);

  cuentasPedidas = computed(() =>
    this.cuentas().filter((c) => c.estado !== 'pago_realizado')
  );

  pagos = computed(() =>
    this.cuentas().filter((c) => c.estado === 'pago_realizado')
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
        .select('id_pedido, id_mesa, id_usuario, subtotal, propina_porcentaje, estado_pedido')
        .in('estado_pedido', ['cuenta_solicitada', 'cuenta_entregada', 'pago_realizado'])
        .order('fecha_emision_pedido', { ascending: true });

      if (error) {
        throw new Error('No pudimos cargar las cuentas.');
      }

      if (!pedidos || pedidos.length === 0) {
        this.cuentas.set([]);
        return;
      }

      // una cuenta por cliente: suma sus pedidos
      const porCliente = new Map<string, CuentaDelMozo>();

      for (const p of pedidos) {
        const existente = porCliente.get(p.id_usuario);

        if (existente) {
          existente.subtotal += p.subtotal;
          continue;
        }

        porCliente.set(p.id_usuario, {
          idPedido: p.id_pedido,
          idUsuario: p.id_usuario,
          idMesa: p.id_mesa,
          numeroMesa: 'sin número',
          estado: p.estado_pedido,
          subtotal: p.subtotal,
          propinaPorcentaje: p.propina_porcentaje,
          totalFinal: null,
        });
      }

      const cuentas = Array.from(porCliente.values());

      const idsMesa = Array.from(new Set(cuentas.map((c) => c.idMesa)));
      const idsPagados = cuentas
        .filter((c) => c.estado === 'pago_realizado')
        .map((c) => c.idPedido);

      const [respuestaMesas, respuestaTickets] = await Promise.all([
        this._db.client.from('mesas').select('id, numero').in('id', idsMesa),
        idsPagados.length > 0
          ? this._db.client.from('ticket').select('id_pedido, total_final').in('id_pedido', idsPagados)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const numeroPorMesa = new Map<string, string>();
      for (const m of respuestaMesas.data ?? []) {
        numeroPorMesa.set(m.id, String(m.numero));
      }

      const totalPorPedido = new Map<string, number>();
      for (const t of respuestaTickets.data ?? []) {
        totalPorPedido.set(t.id_pedido, t.total_final);
      }

      for (const cuenta of cuentas) {
        cuenta.numeroMesa = numeroPorMesa.get(cuenta.idMesa) ?? 'sin número';
        cuenta.totalFinal = totalPorPedido.get(cuenta.idPedido) ?? null;
      }

      this.cuentas.set(cuentas);
    } finally {
      this.cargando.set(false);
    }
  }

  // el mozo lleva la cuenta a la mesa
  async entregarCuenta(cuenta: CuentaDelMozo): Promise<void> {
    const { data, error } = await this._db.client
      .from('pedido')
      .update({ estado_pedido: 'cuenta_entregada' })
      .eq('id_usuario', cuenta.idUsuario)
      .eq('estado_pedido', 'cuenta_solicitada')
      .select('id_pedido');

    if (error || !data || data.length === 0) {
      throw new Error('No pudimos entregar la cuenta.');
    }

    void this._db.client.functions.invoke('notify-pedido-stado', {
      body: {
        idUsuario: cuenta.idUsuario,
        idPedido: cuenta.idPedido,
        nuevoEstado: 'cuenta_entregada',
      },
    });
  }

  // confirma el pago y libera la mesa
  async confirmarPago(cuenta: CuentaDelMozo): Promise<void> {
    const { data: confirmado, error } = await this._db.client.rpc('pedido_confirmar_pago', {
      p_id_pedido: cuenta.idPedido,
    });

    if (error) {
      throw new Error('No pudimos confirmar el pago.');
    }

    if (!confirmado) {
      throw new Error('Este pago ya no se puede confirmar.');
    }

    void this._db.client.functions.invoke('notify-pedido-stado', {
      body: {
        idUsuario: cuenta.idUsuario,
        idPedido: cuenta.idPedido,
        nuevoEstado: 'pagado',
      },
    });

    void this._db.client.functions.invoke('notify-pago', {
      body: { idMesa: cuenta.idMesa, evento: 'confirmado' },
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