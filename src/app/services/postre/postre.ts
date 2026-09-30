import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { CartaItem, TipoCarta } from '../../models/carta.model';

type NuevoPostre = Pick<
  CartaItem,
  'nombre' | 'descripcion' | 'precio' | 'tiempo_elaboracion' | 'foto_1' | 'foto_2' | 'foto_3'
> & Partial<Pick<CartaItem, 'sugerencia'>>;

// postres de la carta para el cocinero
@Injectable({ providedIn: 'root' })
export class Postre {
  private _tableName = 'carta';
  private _tipo: TipoCarta = 'postre';
  private _db = inject(SupabaseService);

  // incluye los postres dados de baja
  async getList(): Promise<CartaItem[]> {
    const { data } = await this._db.client
      .from(this._tableName)
      .select('*')
      .eq('tipo', this._tipo);

    return data ?? [];
  }

  async add(postre: NuevoPostre): Promise<CartaItem> {
    const { data, error } = await this._db.client
      .from(this._tableName)
      .insert({ ...postre, tipo: this._tipo })
      .select()
      .single();

    if (error) throw new Error(`Failed to create postre: ${error.message}`);

    return data;
  }

  async getById(id: string): Promise<CartaItem | null> {
    const { data } = await this._db.client
      .from(this._tableName)
      .select('*')
      .eq('id_carta', id)
      .eq('tipo', this._tipo)
      .maybeSingle();

    return data ?? null;
  }

  async update(id: string, cambios: Partial<NuevoPostre>): Promise<CartaItem> {
    const { data, error } = await this._db.client
      .from(this._tableName)
      .update(cambios)
      .eq('id_carta', id)
      .eq('tipo', this._tipo)
      .select()
      .single();

    if (error) throw new Error(`Failed to update postre: ${error.message}`);

    return data;
  }

  async darDeBaja(id: string): Promise<void> {
    const { error } = await this._db.client
      .from(this._tableName)
      .update({ baja_logica: true })
      .eq('id_carta', id)
      .eq('tipo', this._tipo);

    if (error) throw new Error(`Failed to disable postre: ${error.message}`);
  }

  async reactivar(id: string): Promise<void> {
    const { error } = await this._db.client
      .from(this._tableName)
      .update({ baja_logica: false })
      .eq('id_carta', id)
      .eq('tipo', this._tipo);

    if (error) throw new Error(`Failed to reactivate postre: ${error.message}`);
  }

  async setSugerencia(id: string, sugerencia: boolean): Promise<void> {
    const { error } = await this._db.client
      .from(this._tableName)
      .update({ sugerencia })
      .eq('id_carta', id)
      .eq('tipo', this._tipo);

    if (error) throw new Error(`Failed to update sugerencia: ${error.message}`);
  }
}
