import { inject, Service } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { RealtimeChannel } from '@supabase/supabase-js';

@Service()
export class Waitlist {
  private _tableName = 'lista_espera';
  private _db = inject(SupabaseService);
  private _channel: RealtimeChannel | null = null;

  async getList(): Promise<any[]> {
    const { data } = await this._db.client
      .from(this._tableName)
      .select(`
        id, usuario_id, estado, mesa_id, created_at, updated_at,
        usuarios ( id, nombre, apellido, avatar, perfil )
      `)
      .eq('estado', 'esperando')
      .order('created_at', { ascending: true });

    return data ?? [];
  }

  async add(request: any) {
    const { data, error } = await this._db.client
      .from(this._tableName)
      .insert(request)
      .select()
      .single();

    if (error) throw new Error(`Failed to create waitlist: ${error.message}`);

    return data;
  }

  async getById(id: string) {
    const { data } = await this._db.client
      .from(this._tableName)
      .select(`
        *,
        usuarios(*)
      `)
      .eq('id', id)
      .maybeSingle();

    return data ?? null;
  }

  async getAvailableTables() {
    const { data, error } = await this._db.client
      .from('mesas')
      .select("*")
      .eq('disponibilidad', true)
      .eq('baja_logica', false)
      .order('numero', { ascending: true });

    if (error) throw error;

    return data ?? [];
  }

  async assignTable(entryId: string, mesaId: string) {
    const { error } = await this._db.client.rpc('asignar_mesa', {
      p_lista_espera_id: entryId,
      p_mesa_id: mesaId,
    });

    if (error) throw error;
  }

  async getPosition(usuarioId: string) {
    const { data, error } = await this._db.client
      .from(this._tableName)
      .select('id, usuario_id, created_at')
      .eq('estado', 'esperando')
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    const index = (data ?? []).findIndex((e) => e.usuario_id === usuarioId);
    
    return index === -1 ? null : index + 1;
  }

  async getMyEntry(usuarioId: string) {
    const { data, error } = await this._db.client
      .from(this._tableName)
      .select('*')
      .eq('usuario_id', usuarioId)
      .in('estado', ['esperando', 'asignado'])
      .maybeSingle();

    if (error) throw error;

    return data;
  }

  async getTableById(mesaId: string) {
    const { data, error } = await this._db.client
      .from('mesas')
      .select('*')
      .eq('id', mesaId)
      .single();

    if (error) throw error;

    return data;
  }

  subscribeToChanges(onChange: () => void): () => void {
    const channel = this._db.client
      .channel('waitlist-client-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: this._tableName }, () => onChange())
      .subscribe();

    return () => this._db.client.removeChannel(channel);
  }

  getListChange(onChange: () => void): () => void {
    this._channel = this._db.client
      .channel('waitlist-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: this._tableName },
        () => onChange()
      )
      .subscribe();

    return () => {
      if (this._channel) {
        this._db.client.removeChannel(this._channel);
        this._channel = null;
      }
    };
  }
}
