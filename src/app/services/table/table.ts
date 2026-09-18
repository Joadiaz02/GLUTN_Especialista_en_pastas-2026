import { inject, Service } from '@angular/core';
import { SupabaseService } from '../supabase.service';

@Service()
export class Table {
  private _tableName = 'mesas';
  private _db = inject(SupabaseService);

  async getList(): Promise<any[]> {
    const { data } = await this._db.client
      .from(this._tableName)
      .select('*')

    return data ?? [];
  }
}
