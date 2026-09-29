import { inject, Service } from '@angular/core';
import { SupabaseService } from '../supabase.service';

@Service()
export class User {
  private _tableName = 'usuarios';
  private _db = inject(SupabaseService);

  async getById(id: string) {
    const { data } = await this._db.client
      .from(this._tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    return data ?? null;
  }

  async add(request: any) {
    const { data, error } = await this._db.client
      .from(this._tableName)
      .insert(request)
      .select()
      .single();

    if (error) throw new Error(`Failed to create user: ${error.message}`);

    return data;
  }
}
