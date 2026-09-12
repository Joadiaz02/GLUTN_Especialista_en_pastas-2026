import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { CartaItem, TipoCarta } from '../../models/carta.model';

// Lectura pública de la carta (platos, bebidas y postres juntos),
// para pantallas de cliente como el slide de sugerencias del Home
// y el listado de la Carta (Platos/Bebidas/Postres).
@Injectable({ providedIn: 'root' })
export class Carta {
  private _tableName = 'carta';
  private _db = inject(SupabaseService);

  async getSugeridos(): Promise<CartaItem[]> {
    const { data } = await this._db.client
      .from(this._tableName)
      .select('*')
      .eq('sugerencia', true)
      .eq('baja_logica', false);

    return data ?? [];
  }

  async getPorTipo(tipo: TipoCarta): Promise<CartaItem[]> {
    const { data } = await this._db.client
      .from(this._tableName)
      .select('*')
      .eq('tipo', tipo)
      .eq('baja_logica', false);

    return data ?? [];
  }
}
