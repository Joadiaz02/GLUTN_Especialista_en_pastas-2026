import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { Usuario } from '@app/models/usuario.model';

@Injectable({
  providedIn: 'root',
})
export class ClientsService {

  private readonly supabaseService =
    inject(SupabaseService);



  async obtenerClientesPendientes(): Promise<Usuario[]> {

    const { data, error } =
      await this.supabaseService.client
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
        .eq(
          'perfil',
          'cliente_registrado'
        )
        .eq(
          'estado_aprobacion',
          'pendiente'
        )
        .order(
          'apellido',
          {
            ascending: true,
          }
        );


    if (error) {
      throw error;
    }


    return (data ?? []) as Usuario[];
  }


  obtenerAvatarUrl(
    avatar: string | null | undefined
  ): string | null {

    if (!avatar) {
      return null;
    }


    if (
      avatar.startsWith('http://') ||
      avatar.startsWith('https://')
    ) {
      return avatar;
    }


    const { data } =
      this.supabaseService.client.storage
        .from('images')
        .getPublicUrl(avatar);


    return data.publicUrl;
  }


  async aprobarCliente(
    clienteId: string
  ): Promise<Usuario> {

    const { data, error } =
      await this.supabaseService.client
        .rpc(
          'aprobar_cliente',
          {
            p_cliente_id: clienteId,
          }
        );


    if (error) {
      throw error;
    }


    if (!data) {
      throw new Error(
        'No se pudo aprobar el cliente.'
      );
    }


    return data as Usuario;
  }


  async rechazarCliente(
    clienteId: string,
    motivo: string
  ): Promise<Usuario> {

    const { data, error } =
      await this.supabaseService.client
        .rpc(
          'rechazar_cliente',
          {
            p_cliente_id: clienteId,
            p_motivo: motivo,
          }
        );


    if (error) {
      throw error;
    }


    if (!data) {
      throw new Error(
        'No se pudo rechazar el cliente.'
      );
    }


    return data as Usuario;
  }

  async notificarEstadoCliente(
  clienteId: string,
  estado: 'aprobado' | 'rechazado',
  motivo?: string
): Promise<void> {

  const { data, error } =
    await this.supabaseService.client.functions.invoke(
      'send-client-status-email',
      {
        body: {
          clienteId,
          estado,
          motivo,
        },
      }
    );

  if (error) {
    throw error;
  }

  if (!data?.ok) {
    throw new Error(
      data?.error ??
        'No se pudo enviar el correo.'
    );
  }
}
}