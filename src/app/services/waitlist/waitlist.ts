import { inject, Service } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { RealtimeChannel } from '@supabase/supabase-js';
import { parseTableQr } from '@app/utils';

@Service()
export class Waitlist {
  private _tableName = 'lista_espera';

  private _db = inject(SupabaseService);

  private _channel: RealtimeChannel | null = null;

  async getList(): Promise<any[]> {
    const { data, error } = await this._db.client
      .from(this._tableName)
      .select(`
        id,
        usuario_id,
        estado,
        mesa_id,
        comensales,
        consideraciones,
        created_at,
        updated_at,
        usuarios (
          id,
          nombre,
          apellido,
          avatar,
          perfil
        )
      `)
      .eq('estado', 'esperando')
      .order('created_at', {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  async add(request: any): Promise<any> {
    const { data, error } =
      await this._db.client
        .from(this._tableName)
        .insert(request)
        .select()
        .single();

    if (error) {
      throw new Error(
        `Failed to create waitlist: ${error.message}`
      );
    }

    return data;
  }

  async notifyNewWaitlist(
    entryId: string
  ): Promise<void> {
    const { error } =
      await this._db.client.functions.invoke(
        'notify-new-waitlist',
        {
          body: {
            entryId,
          },
        }
      );

    if (error) {
      throw error;
    }
  }

  async getById(id: string): Promise<any | null> {
    const { data, error } =
      await this._db.client
        .from(this._tableName)
        .select(`
          id,
          usuario_id,
          estado,
          mesa_id,
          comensales,
          consideraciones,
          created_at,
          updated_at,
          usuarios(*)
        `)
        .eq('id', id)
        .maybeSingle();

    if (error) {
      throw error;
    }

    return data ?? null;
  }

  async getTablesForAssignment(
    entry: any
  ): Promise<any[]> {
    const { data, error } =
      await this._db.client
        .from('mesas')
        .select('*')
        .order('numero', {
          ascending: true,
        });

    if (error) {
      throw error;
    }

    const comensales = Number(
      entry?.comensales ?? 1
    );

    const consideraciones =
      Array.isArray(entry?.consideraciones)
        ? entry.consideraciones
        : [];

    return (data ?? []).map((table) => {
      const fueraDeServicio =
        Boolean(table.baja_logica);

      const ocupada =
        !fueraDeServicio &&
        table.disponibilidad === false;

      const capacidadOk =
        Number(table.capacidad) >= comensales;

      const movilidadOk =
        !consideraciones.includes(
          'movilidad_reducida'
        ) ||
        [
          'movilidad_reducida',
          'vip_movilidad_reducida',
        ].includes(table.tipo);

      const compatible =
        !fueraDeServicio &&
        !ocupada &&
        capacidadOk &&
        movilidadOk;

      let estadoVisual:
        | 'disponible'
        | 'ocupada'
        | 'no_apta';

      if (fueraDeServicio) {
        estadoVisual = 'no_apta';
      } else if (ocupada) {
        estadoVisual = 'ocupada';
      } else if (
        capacidadOk &&
        movilidadOk
      ) {
        estadoVisual = 'disponible';
      } else {
        estadoVisual = 'no_apta';
      }

      return {
        ...table,
        compatible,
        estadoVisual,
      };
    });
  }

  async getAvailableTables(
    entry?: any
  ): Promise<any[]> {
    const { data, error } =
      await this._db.client
        .from('mesas')
        .select('*')
        .eq('disponibilidad', true)
        .eq('baja_logica', false)
        .order('numero', {
          ascending: true,
        });

    if (error) {
      throw error;
    }

    const tables = data ?? [];

    if (!entry) {
      return tables;
    }

    const comensales = Number(
      entry.comensales ?? 1
    );

    const consideraciones =
      Array.isArray(entry.consideraciones)
        ? entry.consideraciones
        : [];

    return tables.filter((table) => {
      if (
        Number(table.capacidad) <
        comensales
      ) {
        return false;
      }

      if (
        consideraciones.includes(
          'movilidad_reducida'
        )
      ) {
        return [
          'movilidad_reducida',
          'vip_movilidad_reducida',
        ].includes(table.tipo);
      }

      return true;
    });
  }

  async assignTable(
    entryId: string,
    mesaId: string
  ): Promise<void> {
    const entry =
      await this.getById(entryId);

    if (!entry) {
      throw new Error(
        'No se encontró al cliente en la lista de espera.'
      );
    }

    const {
      data: table,
      error: tableError,
    } = await this._db.client
      .from('mesas')
      .select('*')
      .eq('id', mesaId)
      .maybeSingle();

    if (tableError) {
      throw tableError;
    }

    if (!table) {
      throw new Error(
        'La mesa seleccionada no existe.'
      );
    }

    if (table.baja_logica) {
      throw new Error(
        'La mesa seleccionada está fuera de servicio.'
      );
    }

    if (table.disponibilidad === false) {
      throw new Error(
        'La mesa seleccionada ya no está disponible.'
      );
    }

    const comensales = Number(
      entry.comensales ?? 1
    );

    const consideraciones =
      Array.isArray(entry.consideraciones)
        ? entry.consideraciones
        : [];

    if (
      Number(table.capacidad) <
      comensales
    ) {
      throw new Error(
        `La mesa ${table.numero} tiene capacidad para ${table.capacidad} personas y el grupo necesita ${comensales}.`
      );
    }

    if (
      consideraciones.includes(
        'movilidad_reducida'
      ) &&
      ![
        'movilidad_reducida',
        'vip_movilidad_reducida',
      ].includes(table.tipo)
    ) {
      throw new Error(
        'El cliente necesita una mesa apta para movilidad reducida.'
      );
    }

    const { error } =
      await this._db.client.rpc(
        'asignar_mesa_validada',
        {
          p_lista_espera_id: entryId,
          p_mesa_id: mesaId,
        }
      );

    if (error) {
      throw error;
    }

    try {
      await this._db.client.functions.invoke(
        'notify-table-assigned',
        {
          body: {
            usuarioId: entry.usuario_id,
            mesaNumero: table.numero,
          },
        }
      );
    } catch (error) {
      console.warn(
        'La mesa fue asignada, pero no se pudo enviar el push:',
        error
      );
    }
  }

async remove(
  entryId: string
): Promise<void> {
  const { data, error } =
    await this._db.client
      .from(this._tableName)
      .delete()
      .eq('id', entryId)
      .select('id');

  if (error) {
    throw error;
  }
  if (!data || data.length === 0) {
    throw new Error(
      'No se pudo eliminar el cliente de la lista de espera.'
    );
  }
}

  async getPosition(
    usuarioId: string
  ): Promise<number | null> {
    const { data, error } =
      await this._db.client
        .from(this._tableName)
        .select(
          'id, usuario_id, created_at'
        )
        .eq('estado', 'esperando')
        .order('created_at', {
          ascending: true,
        });

    if (error) {
      throw error;
    }

    const index =
      (data ?? []).findIndex(
        (entry) =>
          entry.usuario_id === usuarioId
      );

    return index === -1
      ? null
      : index + 1;
  }

  async linkTable(
    userId: string,
    scannedText: string
  ) {
    const scannedTableId =
      parseTableQr(scannedText);

    if (!scannedTableId) {
      return {
        ok: false,
        reason: 'invalid_qr',
      };
    }

    const { data, error } =
      await this._db.client
        .from('lista_espera')
        .select(
          'id, estado, mesa_id, mesas(numero)'
        )
        .eq('usuario_id', userId)
        .in('estado', [
          'asignado',
          'en_mesa',
        ])
        .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return {
        ok: false,
        reason: 'no_table_assigned',
      };
    }

    const entry = data as any;

    if (
      entry.mesa_id !== scannedTableId
    ) {
      return {
        ok: false,
        reason: 'wrong_table',
        correctTableNumber:
          entry.mesas.numero,
      };
    }

    if (entry.estado === 'asignado') {
      const { error: updateError } =
        await this._db.client
          .from('lista_espera')
          .update({
            estado: 'en_mesa',
            updated_at:
              new Date().toISOString(),
          })
          .eq('id', entry.id);

      if (updateError) {
        throw updateError;
      }
    }

    return {
      ok: true,
    };
  }

  async getMyEntry(
    usuarioId: string
  ) {
    const { data, error } =
      await this._db.client
        .from(this._tableName)
        .select(`
          id,
          usuario_id,
          estado,
          mesa_id,
          comensales,
          consideraciones,
          created_at,
          updated_at
        `)
        .eq('usuario_id', usuarioId)
        .in('estado', [
          'esperando',
          'asignado',
        ])
        .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  async getTableById(
    mesaId: string
  ) {
    const { data, error } =
      await this._db.client
        .from('mesas')
        .select('*')
        .eq('id', mesaId)
        .single();

    if (error) {
      throw error;
    }

    return data;
  }

  subscribeToChanges(
    onChange: () => void
  ): () => void {
    const channel =
      this._db.client
        .channel(
          'waitlist-client-changes'
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: this._tableName,
          },
          () => onChange()
        )
        .subscribe();

    return () =>
      this._db.client.removeChannel(
        channel
      );
  }

  getListChange(
    onChange: () => void
  ): () => void {
    this._channel =
      this._db.client
        .channel('waitlist-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: this._tableName,
          },
          () => onChange()
        )
        .subscribe();

    return () => {
      if (this._channel) {
        this._db.client.removeChannel(
          this._channel
        );

        this._channel = null;
      }
    };
  }
}