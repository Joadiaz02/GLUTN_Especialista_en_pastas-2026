import { inject, Service, DestroyRef } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase.service';

@Service()
export class Drink {
  private _tableName = 'carta';
  private _db = inject(SupabaseService);
  private _destroyRef = inject(DestroyRef);

  private _channel?: RealtimeChannel;
  private _list$ = new BehaviorSubject<any[] | null>(null);
  private _destroyRegistrado = false;

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

  async update(id: string, changes: any): Promise<any> {
    const { data, error } = await this._db.client
      .from(this._tableName)
      .update(changes)
      .eq('id_carta', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update table: ${error.message}`);

    return data;
  }

  getListChanges(): Observable<any[] | null> {
    this._init();

    return this._list$.asObservable();
  }

  private async _init(): Promise<void> {
    // Se registra antes que cualquier await: si no, y el injector se
    // destruye mientras getList() todavía está en vuelo (por ejemplo en un
    // test que termina rápido), onDestroy() explota porque el injector ya
    // no existe cuando se intenta registrar.
    if (!this._destroyRegistrado) {
      this._destroyRegistrado = true;

      this._destroyRef.onDestroy(() => {
        if (this._channel) {
          this._db.client.removeChannel(this._channel);
          this._channel = undefined;
        }
      });
    }

    const initialData = await this.getList();

    this._list$.next(initialData);

    if (this._channel) return;

    this._channel = this._db.client
      .channel('carta-bebida-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: this._tableName,
          filter: 'tipo=eq.bebida',
        },
        (payload: any) => {
          const currentList = this._list$.getValue() ?? [];

          switch (payload.eventType) {
            case 'INSERT':
              this._list$.next([...currentList, payload.new]);

              break;

            case 'UPDATE':
              this._list$.next(
                currentList.map((item) =>
                  item.id_carta === payload.new.id_carta ? payload.new : item
                )
              );

              break;
          }
        }
      )
      .subscribe();
  }
}
