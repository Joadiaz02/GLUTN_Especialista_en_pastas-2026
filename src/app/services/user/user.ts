import { inject, Service } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { Observable } from 'rxjs';

const EMPLOYEE_ROLES = ['metre', 'mozo', 'cocinero', 'cantinero'];

@Service()
export class User {
  private _tableName = 'usuarios';
  private _db = inject(SupabaseService);

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

      const emit = () => {
        const sorted = [...employees].sort((a, b) =>
          (a.apellido ?? '').localeCompare(b.apellido ?? '')
        );
        subscriber.next(sorted);
      };

      const upsert = (row: any) => {
        employees = employees.filter((e) => e.id !== row.id);

        if (EMPLOYEE_ROLES.includes(row.perfil)) {
          employees.push(row);
        }

        emit();
      };
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
}
