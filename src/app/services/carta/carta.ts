import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { CartaItem, TipoCarta } from '../../models/carta.model';

// lectura de la carta para los clientes
@Injectable({ providedIn: 'root' })
export class Carta {
  private _tableName = 'carta';
  private _db = inject(SupabaseService);

  async getSugeridos(): Promise<CartaItem[]> {
    const { data, error } = await this._db.client
      .from(this._tableName)
      .select('*')
      .eq('sugerencia', true)
      .eq('baja_logica', false);

    if (error) {
      throw new Error('No pudimos cargar los productos destacados.');
    }

    return data ?? [];
  }

  async getPorTipo(tipo: TipoCarta): Promise<CartaItem[]> {
    const { data, error } = await this._db.client
      .from(this._tableName)
      .select('*')
      .eq('tipo', tipo)
      .eq('baja_logica', false);

    if (error) {
      throw new Error('No pudimos cargar la carta.');
    }

    return data ?? [];
  }
}
