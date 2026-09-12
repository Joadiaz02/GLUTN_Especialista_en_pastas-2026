import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../supabase.service';

@Injectable({ providedIn: 'root' })
export class Drink {
  private _tableName = 'drinks';
  private _db = inject(SupabaseService);

  async getList(): Promise<any[]> {
    const { data } = await this._db.client.from(this._tableName).select('*');

    return data ?? [];
  }

  async add(drink: any): Promise<any> {
    const { data, error } = await this._db.client
      .from(this._tableName)
      .insert(drink)
      .select()
      .single();

    if (error) throw new Error(`Failed to create drink: ${error.message}`);

    return data;
  }
}
