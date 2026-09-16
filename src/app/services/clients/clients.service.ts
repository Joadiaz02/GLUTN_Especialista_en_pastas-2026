import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { Usuario } from '@app/models/usuario.model';

@Injectable({
  providedIn: 'root',
})
export class ClientsService {
  private readonly supabaseService = inject(SupabaseService);

  async obtenerClientesPendientes(): Promise<Usuario[]> {
    const { data, error } = await this.supabaseService.client
      .from('usuarios')
      .select(`
        id,
        apellido,
        nombre,
        documento,
        perfil,
        avatar,
        estado_aprobacion,
        motivo_rechazo
      `)
      .eq('perfil', 'cliente_registrado')
      .eq('estado_aprobacion', 'pendiente')
      .order('apellido', { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []) as Usuario[];
  }

  obtenerAvatarUrl(avatar: string | null | undefined): string | null {
    if (!avatar) {
      return null;
    }

    if (
      avatar.startsWith('http://') ||
      avatar.startsWith('https://')
    ) {
      return avatar;
    }

    const { data } = this.supabaseService.client.storage
      .from('images')
      .getPublicUrl(avatar);

    return data.publicUrl;
  }
}