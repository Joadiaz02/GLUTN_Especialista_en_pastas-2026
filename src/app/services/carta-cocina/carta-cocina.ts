import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { CartaItem, TipoCarta } from '../../models/carta.model';

// lo que carga el cocinero
export type TipoCocina = Extract<TipoCarta, 'plato' | 'postre'>;

type NuevoProducto = Pick<
  CartaItem,
  'nombre' | 'descripcion' | 'precio' | 'tiempo_elaboracion' | 'foto_1' | 'foto_2' | 'foto_3'
> & Partial<Pick<CartaItem, 'sugerencia'>>;

// platos y postres de la carta para el cocinero
@Injectable({ providedIn: 'root' })
export class CartaCocina {
  private _tableName = 'carta';
  private _db = inject(SupabaseService);

  // incluye los dados de baja
  async getList(tipo: TipoCocina): Promise<CartaItem[]> {
    const { data } = await this._db.client
      .from(this._tableName)
      .select('*')
      .eq('tipo', tipo);

    return data ?? [];
  }

  async add(tipo: TipoCocina, producto: NuevoProducto): Promise<CartaItem> {
    const { data, error } = await this._db.client
      .from(this._tableName)
      .insert({ ...producto, tipo })
      .select()
      .single();

    if (error) throw new Error(`No se pudo crear el ${tipo}: ${error.message}`);

    return data;
  }

  async getById(tipo: TipoCocina, id: string): Promise<CartaItem | null> {
    const { data } = await this._db.client
      .from(this._tableName)
      .select('*')
      .eq('id_carta', id)
      .eq('tipo', tipo)
      .maybeSingle();

    return data ?? null;
  }

  async update(tipo: TipoCocina, id: string, cambios: Partial<NuevoProducto>): Promise<CartaItem> {
    const { data, error } = await this._db.client
      .from(this._tableName)
      .update(cambios)
      .eq('id_carta', id)
      .eq('tipo', tipo)
      .select()
      .single();

    if (error) throw new Error(`No se pudo actualizar el ${tipo}: ${error.message}`);

    return data;
  }

  async darDeBaja(tipo: TipoCocina, id: string): Promise<void> {
    await this.cambiar(tipo, id, { baja_logica: true });
  }

  async reactivar(tipo: TipoCocina, id: string): Promise<void> {
    await this.cambiar(tipo, id, { baja_logica: false });
  }

  async setSugerencia(tipo: TipoCocina, id: string, sugerencia: boolean): Promise<void> {
    await this.cambiar(tipo, id, { sugerencia });
  }

  private async cambiar(
    tipo: TipoCocina,
    id: string,
    cambios: Partial<Pick<CartaItem, 'baja_logica' | 'sugerencia'>>
  ): Promise<void> {
    const { error } = await this._db.client
      .from(this._tableName)
      .update(cambios)
      .eq('id_carta', id)
      .eq('tipo', tipo);

    if (error) throw new Error(`No se pudo actualizar el ${tipo}: ${error.message}`);
  }
}
