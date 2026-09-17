import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { CartaItem, TipoCarta } from '../../models/carta.model';

type NuevoPlato = Pick<
  CartaItem,
  'nombre' | 'descripcion' | 'precio' | 'tiempo_elaboracion' | 'foto_1' | 'foto_2' | 'foto_3'
> & Partial<Pick<CartaItem, 'sugerencia'>>;

// Platos, bebidas y postres viven todos en la misma tabla "carta",
// distinguidos por la columna "tipo". Este servicio es el recorte
// de ese servicio general para el rol cocinero (tipo = 'plato').
@Injectable({ providedIn: 'root' })
export class Plato {
  private _tableName = 'carta';
  private _tipo: TipoCarta = 'plato';
  private _db = inject(SupabaseService);

  // El cocinero ve TODOS sus platos, incluidos los dados de baja
  // (marcados en la UI, no ocultos) — a diferencia de Carta.getPorTipo,
  // que sí los oculta de la vista del cliente.
  async getList(): Promise<CartaItem[]> {
    const { data } = await this._db.client
      .from(this._tableName)
      .select('*')
      .eq('tipo', this._tipo);

    return data ?? [];
  }

  async add(plato: NuevoPlato): Promise<CartaItem> {
    const { data, error } = await this._db.client
      .from(this._tableName)
      .insert({ ...plato, tipo: this._tipo })
      .select()
      .single();

    if (error) throw new Error(`Failed to create plato: ${error.message}`);

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

  async update(id: string, cambios: Partial<NuevoPlato>): Promise<CartaItem> {
    const { data, error } = await this._db.client
      .from(this._tableName)
      .update(cambios)
      .eq('id_carta', id)
      .eq('tipo', this._tipo)
      .select()
      .single();

    if (error) throw new Error(`Failed to update plato: ${error.message}`);

    return data;
  }

  async darDeBaja(id: string): Promise<void> {
    const { error } = await this._db.client
      .from(this._tableName)
      .update({ baja_logica: true })
      .eq('id_carta', id)
      .eq('tipo', this._tipo);

    if (error) throw new Error(`Failed to disable plato: ${error.message}`);
  }

  async reactivar(id: string): Promise<void> {
    const { error } = await this._db.client
      .from(this._tableName)
      .update({ baja_logica: false })
      .eq('id_carta', id)
      .eq('tipo', this._tipo);

    if (error) throw new Error(`Failed to reactivate plato: ${error.message}`);
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
