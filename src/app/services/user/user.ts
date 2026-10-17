import { DestroyRef, inject, Service } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { RealtimeChannel } from '@supabase/supabase-js';

const EMPLOYEE_ROLES = ['metre', 'mozo', 'cocinero', 'cantinero'];

@Service()
export class User {
  private _tableName = 'usuarios';
  private _db = inject(SupabaseService);

  private _destroyRef = inject(DestroyRef);
  private _channel?: RealtimeChannel;
  private _list$ = new BehaviorSubject<any[] | null>(null);
  private _destroyRegistrado = false;

  async getById(id: string) {
    const { data } = await this._db.client
      .from(this._tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    return data ?? null;
  }

  async getEmployeeList() {
    const { data, error } = await this._db.client
      .from(this._tableName)
      .select('*')
      .in('perfil', ['metre', 'mozo', 'cocinero', 'cantinero'])
      .order('apellido', { ascending: true });

    if (error) throw error;

    return data ?? [];
  }

  getEmployeeListChange() {
    return new Observable<any[]>((subscriber) => {
      let employees: any[] = [];
      console.log(subscriber)
      console.log(employees)

      const emit = () => {
        const sorted = [...employees].sort((a, b) =>
          (a.apellido ?? '').localeCompare(b.apellido ?? '')
        );
        subscriber.next(sorted);
      };

      console.log(emit)

      const upsert = (row: any) => {
        employees = employees.filter((e) => e.id !== row.id);

        if (EMPLOYEE_ROLES.includes(row.perfil)) {
          employees.push(row);
        }

        emit();
      };

      console.log(upsert)
      const channel = this._db.client
        .channel(`employees-changes-${crypto.randomUUID()}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: this._tableName },
          (payload) => upsert(payload.new)
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: this._tableName },
          (payload) => upsert(payload.new)
        )
        .subscribe(async (status, err) => {
          console.log(status)
          if (status === 'SUBSCRIBED') {
            try {
              employees = await this.getEmployeeList();
              emit();
            } catch (error) {
              subscriber.error(error);
            }
          }

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            subscriber.error(err ?? new Error(`Realtime error: ${status}`));
          }
        });

      return () => {
        this._db.client.removeChannel(channel);
      };
    });
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

  async update(id: string, changes: any): Promise<any> {
    const { data, error } = await this._db.client
      .from(this._tableName)
      .update(changes)
      .eq('id', id)
      .select()
      .single();

      console.log(data)

    if (error) throw new Error(`Failed to update user: ${error.message}`);

    return data;
  }

  getListChanges(): Observable<any[] | null> {
    this._init();

    return this._list$.asObservable();
  }

  private async _init(): Promise<void> {
    if (!this._destroyRegistrado) {
      this._destroyRegistrado = true;

      this._destroyRef.onDestroy(() => {
        if (this._channel) {
          this._db.client.removeChannel(this._channel);
          this._channel = undefined;
        }
      });
    }

    const initialData = await this.getEmployeeList();

    this._list$.next(initialData);

    if (this._channel) return;

    this._channel = this._db.client
      .channel('users-changes')
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
                  item.id === payload.new.id ? payload.new : item
                )
              );

              break;
          }
        }
      )
      .subscribe();
  }
}
