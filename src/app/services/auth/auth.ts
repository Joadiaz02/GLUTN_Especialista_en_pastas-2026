import {
  inject,
  Injectable,
  signal,
} from '@angular/core';

import { SupabaseService } from '../supabase.service';
import { EPerfilUsuario } from '@app/enums';
import type { PerfilUsuario } from '@app/models/usuario.model';
import { Storage } from '../storage';

@Injectable({
  providedIn: 'root',
})
export class Auth {

  private readonly supabaseService =
    inject(SupabaseService);

  private readonly storageService =
    inject(Storage);

  usuarioActual = signal<any>(null);


  constructor() {
    // onAuthStateChange es el evento oficial de Supabase: se dispara
    // en login, logout, refresh de token, y al arrancar la app con
    // la sesión restaurada. Mantiene el signal sincronizado solo.
    this.supabaseService.client.auth
      .onAuthStateChange(
        (_event, session) => {

          this.usuarioActual.set(
            session?.user ?? null
          );

        }
      );
  }


  async obtenerUsuarioActual(): Promise<any> {

    const {
      data,
    } =
      await this.supabaseService.client.auth
        .getSession();

    this.usuarioActual.set(
      data.session?.user ?? null
    );

    return this.usuarioActual();
  }


  obtenerPerfil(
    usuario: any =
      this.usuarioActual()
  ): PerfilUsuario | null {

    const perfil =
      usuario?.user_metadata?.['perfil'];

    if (!perfil) {
      return null;
    }

    return perfil as PerfilUsuario;
  }


  esPersonal(
    usuario: any =
      this.usuarioActual()
  ): boolean {

    const perfil =
      this.obtenerPerfil(
        usuario
      );

    return [
      EPerfilUsuario.Dueno,
      EPerfilUsuario.Supervisor,
      EPerfilUsuario.Metre,
      EPerfilUsuario.Mozo,
      EPerfilUsuario.Cocinero,
      EPerfilUsuario.Cantinero,
    ].includes(
      perfil as EPerfilUsuario
    );
  }


  async register(
    request: any,
    role: EPerfilUsuario
  ): Promise<void> {

    const avatarUrl =
      await this.storageService
        .uploadImage(
          request.profile.file
        );

    const {
      data,
      error,
    } =
      await this.supabaseService.client.auth
        .signUp({

          email:
            request.credentials.email,

          password:
            request.credentials.password,

          options: {

            data: {

              apellido:
                request.personal.lastName,

              nombre:
                request.personal.name,

              documento:
                request.personal.dni,

              perfil:
                role,

              avatar:
                avatarUrl,
            },
          },
        });


    if (error) {
      throw error;
    }


    if (!data.user) {
      throw new Error(
        'No se pudo crear la cuenta.'
      );
    }

    if (
      role !==
      EPerfilUsuario.ClienteRegistrado
    ) {
      return;
    }

    const {
      error: errorCorreo,
    } =
      await this.supabaseService.client
        .functions
        .invoke(
          'send-client-status-email',
          {
            body: {

              clienteId:
                data.user.id,

              estado:
                'pendiente',
            },
          }
        );


    if (errorCorreo) {

      console.error(
        'La cuenta fue creada, pero no se pudo enviar el correo de pendiente:',
        errorCorreo
      );
    }

    if (
      data.session?.access_token
    ) {

      const {
        error: errorPush,
      } =
        await this.supabaseService.client
          .functions
          .invoke(
            'notify-pending-client',
            {

              body: {

                clienteId:
                  data.user.id,

              },

              headers: {

                Authorization:
                  `Bearer ${data.session.access_token}`,

              },
            }
          );


      if (errorPush) {
        console.error(
          'La cuenta fue creada, pero no se pudo notificar a los gestores:',
          errorPush
        );
      }

    } else {

      console.warn(
        'La cuenta fue creada, pero Supabase no devolvió una sesión para enviar la notificación Push.'
      );
    }
  }


  async iniciarsecion(
    request: {
      email: string;
      password: string;
    }
  ): Promise<any> {

    const {
      data,
      error,
    } =
      await this.supabaseService.client.auth
        .signInWithPassword({

          email:
            request.email,

          password:
            request.password,

        });


    if (error) {

      throw new Error(
        `Login fallido: ${error.message}`
      );
    }


    if (!data.user) {

      throw new Error(
        'Login fallido: no se retorno un usuario'
      );
    }


    const perfil =
      data.user
        .user_metadata?.['perfil'];

    if (
      perfil !==
      EPerfilUsuario.ClienteRegistrado
    ) {
      this.usuarioActual.set(
        data.user
      );

      return data.user;
    }

    const {
      data: estado,
      error: errorEstado,
    } =
      await this.supabaseService.client
        .rpc(
          'obtener_estado_aprobacion'
        );


    if (errorEstado) {

      await this.supabaseService.client.auth
        .signOut();

      this.usuarioActual.set(
        null
      );

      throw new Error(
        'No se pudo verificar el estado de la cuenta.'
      );
    }

    if (
      estado === 'pendiente'
    ) {

      await this.supabaseService.client.auth
        .signOut();

      this.usuarioActual.set(
        null
      );

      throw new Error(
        'CUENTA_PENDIENTE'
      );
    }

    if (
      estado === 'rechazado'
    ) {

      await this.supabaseService.client.auth
        .signOut();

      this.usuarioActual.set(
        null
      );

      throw new Error(
        'CUENTA_RECHAZADA'
      );
    }

    if (
      estado === 'aprobado'
    ) {

      this.usuarioActual.set(
        data.user
      );

      return data.user;
    }

    await this.supabaseService.client.auth
      .signOut();

    this.usuarioActual.set(
      null
    );

    throw new Error(
      'No se pudo verificar el estado de la cuenta.'
    );
  }


  async logout(): Promise<void> {

    await this.supabaseService.client.auth
      .signOut();

    this.usuarioActual.set(
      null
    );
  }


  estaLogueado(): boolean {

    return (
      this.usuarioActual() !== null
    );
  }
}