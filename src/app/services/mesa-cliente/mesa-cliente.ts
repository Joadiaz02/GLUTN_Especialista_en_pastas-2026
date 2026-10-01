import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { Auth } from '../auth/auth';
import { SupabaseService } from '../supabase.service';

// mesa asignada al cliente, en vivo
@Injectable({ providedIn: 'root' })
export class MesaCliente {
  private _db = inject(SupabaseService);
  private _auth = inject(Auth);

  private _canal?: RealtimeChannel;

  // número de mesa visible
  numero = signal<string | null>(null);

  // compara por id para no repetir la consulta
  private _idCliente = computed<string | null>(() => {
    const usuario = this._auth.usuarioActual();

    return usuario && !this._auth.esPersonal(usuario) ? usuario.id : null;
  });

  constructor() {
    effect(() => {
      const idCliente = this._idCliente();
      untracked(() => void this.seguir(idCliente));
    });
  }

  async actualizar(): Promise<void> {
    const idCliente = this._idCliente();

    if (!idCliente) {
      this.numero.set(null);
      return;
    }

    const numero = await this.buscarNumero(idCliente);

    // descarta la respuesta si cambió el usuario
    if (this._idCliente() === idCliente) {
      this.numero.set(numero);
    }
  }

  private async seguir(idCliente: string | null): Promise<void> {
    if (this._canal) {
      void this._db.client.removeChannel(this._canal);
      this._canal = undefined;
    }

    this.numero.set(null);

    if (!idCliente) {
      return;
    }

    this._canal = this._db.client
      .channel(`mesa-cliente-${idCliente}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lista_espera',
          filter: `usuario_id=eq.${idCliente}`,
        },
        () => void this.actualizar()
      )
      .subscribe();

    await this.actualizar();
  }

  private async buscarNumero(idCliente: string): Promise<string | null> {
    const { data: entrada } = await this._db.client
      .from('lista_espera')
      .select('mesa_id')
      .eq('usuario_id', idCliente)
      .eq('estado', 'en_mesa')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!entrada?.mesa_id) {
      return null;
    }

    const { data: mesa } = await this._db.client
      .from('mesas')
      .select('numero')
      .eq('id', entrada.mesa_id)
      .maybeSingle();

    return mesa ? String(mesa.numero) : null;
  }
}
