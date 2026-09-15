import { inject, Service } from '@angular/core';
import { SupabaseService } from '../supabase.service';

@Service()
export class Drink {
  private _tableName = 'carta';
  private _db = inject(SupabaseService);

  async getList(): Promise<any[]> {
    const { data } = await this._db.client
      .from(this._tableName)
      .select('*')
      .eq('tipo', 'bebida');

    return data ?? [];
  }

  async getById(id: string) {
    const { data } = await this._db.client
      .from(this._tableName)
      .select('*')
      .eq('id_carta', id)
      .maybeSingle();

    return data ?? null;
  }

  async add(table: any): Promise<any> {
    const { data, error } = await this._db.client
      .from(this._tableName)
      .insert(table)
      .select()
      .single();

    if (error) throw new Error(`Failed to create table: ${error.message}`);

    return data;
  }
}
