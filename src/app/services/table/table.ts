import { DestroyRef, inject, Service } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { RealtimeChannel } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';

@Service()
export class Table {
  private _tableName = 'mesas';
  private _db = inject(SupabaseService);
  private _destroyRef = inject(DestroyRef);

  private _channel?: RealtimeChannel;
  private _list$ = new BehaviorSubject<any[] | null>(null);

  async getList(): Promise<any[]> {
    const { data } = await this._db.client
      .from(this._tableName)
      .select('*')
      .order('numero', { ascending: true })

    return data ?? [];
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

  getListChanges(): Observable<any[] | null> {
    this._init();

    return this._list$.asObservable();
  }

  private async _init(): Promise<void> {
    const initialData = await this.getList();

    this._list$.next(initialData);

    if (this._channel) return;

    this._channel = this._db.client
      .channel('mesa-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: this._tableName,
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

    this._destroyRef.onDestroy(() => {
      if (this._channel) {
        this._db.client.removeChannel(this._channel);
        this._channel = undefined;
      }
    });
  }
}
