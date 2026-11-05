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
  propina: number | null;
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
      .select('id_pedido, id_mesa, id_usuario, subtotal, estado_pedido') // Quitamos propina_porcentaje
      .in('estado_pedido', ['cuenta_solicitada', 'cuenta_entregada', 'pago_realizado'])
      .order('fecha_emision_pedido', { ascending: true });

    console.log("TODOS LOS PEDIDOS")
    console.log(pedidos)
    console.log("------------------------")

    if (error) throw new Error('No pudimos cargar las cuentas.');
    if (!pedidos || pedidos.length === 0) {
      this.cuentas.set([]);
      return;
    }

    const porCliente = new Map<string, any>();
    // const porCliente = new Map<string, CuentaDelMozo>();

    console.log("FOR PEDIDOS")
    for (const p of pedidos) {
      console.log("--")
      console.log(p)
      console.log(p.id_usuario)
      const existente = porCliente.get(p.id_usuario);
      
      console.log(existente)
      
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
        propina: null,
        totalFinal: null,
      });
    }
    console.log("FOR PEDIDOS TERMINADO--------------------")

    const cuentas = Array.from(porCliente.values());
    const idsMesa = Array.from(new Set(cuentas.map((c) => c.idMesa)));
    const idsPagados = cuentas
      .filter((c) => c.estado === 'pago_realizado' || c.estado === 'cuenta_entregada')
      .map((c) => c.idPedido);

    console.log("IDS PAGADOS")
    console.log(idsPagados)
    console.log(cuentas)
    console.log(porCliente)
    console.log("------------------------")

    // Consultamos la tabla ticket para obtener la propina y el total final reales
    const [respuestaMesas, respuestaTickets] = await Promise.all([
      this._db.client.from('mesas').select('id, numero').in('id', idsMesa),
      idsPagados.length > 0
        ? this._db.client.from('ticket').select('id_pedido, propina, total_final').in('id_pedido', idsPagados)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const numeroPorMesa = new Map<string, string>();
    for (const m of respuestaMesas.data ?? []) {
      numeroPorMesa.set(m.id, String(m.numero));
    }

    const ticketPorPedido = new Map<string, { propina: number; totalFinal: number }>();
    for (const t of respuestaTickets.data ?? []) {
      ticketPorPedido.set(t.id_pedido, { propina: t.propina, totalFinal: t.total_final });
    }

    console.log("FOR")
    for (const cuenta of cuentas) {
      console.log(cuenta)
      cuenta.numeroMesa = numeroPorMesa.get(cuenta.idMesa) ?? 'sin número';
      const ticketInfo = ticketPorPedido.get(cuenta.idPedido);
      if (ticketInfo) {
        cuenta.propina = ticketInfo.propina;
        cuenta.totalFinal = ticketInfo.totalFinal;
      }
    }
    console.log("FOR TERMINADO-----------")

    console.log("CUENTAS ANTES DEL SIGNAL")
    console.log(cuentas)
    console.log("------------------------")

    this.cuentas.set(cuentas);

    console.log("cuenta.ts 121 | LISTADO DE PEDIDO")
    console.log("Cuentas")
    console.log(this.cuentasPedidas())
    console.log("Pagos")
    console.log(this.cuentas())
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
    console.log("cuenta.ts 149 | CONFIRMAR PAGO CUENTA.TS")
    console.log(cuenta)
    console.log(cuenta.idPedido)

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
      body: { idMesa: cuenta.idMesa, idPedido: cuenta.idPedido, evento: 'confirmado' },
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