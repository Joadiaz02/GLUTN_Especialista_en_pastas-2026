import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { EPerfilUsuario } from '@app/enums';
import { Storage } from '../storage';
import type { PerfilUsuario } from '@app/models/usuario.model';

@Injectable({ providedIn: 'root' })
export class Auth {

  private _supabaseService = inject(SupabaseService);
  private _storageService = inject(Storage);

  // Signal en vez de variable plana: cualquier componente que lo lea
  // en su template (usuarioActual()) se actualiza SOLO cuando cambia.
  usuarioActual = signal<any>(null);

  constructor() {

    // onAuthStateChange es el evento oficial de Supabase: se dispara
    // en login, logout, refresh de token, y al arrancar la app con
    // la sesión restaurada. Mantiene el signal sincronizado solo.
    this._supabaseService.client.auth.onAuthStateChange((_event, session) => {
      this.usuarioActual.set(session?.user ?? null);
    });

  }

  async obtenerUsuarioActual(): Promise<any> {

    const { data } =
      await this._supabaseService.client.auth.getSession();

    this.usuarioActual.set(
      data.session?.user ?? null
    );

    return this.usuarioActual();
  }

  obtenerPerfil(
  usuario: any = this.usuarioActual()
): PerfilUsuario | null {

  const perfil = usuario?.user_metadata?.perfil;

  if (!perfil) {
    return null;
  }

  return perfil as PerfilUsuario;
}

  esPersonal(
    usuario: any = this.usuarioActual()
  ): boolean {

    const perfil =
      this.obtenerPerfil(usuario);

    return [

      EPerfilUsuario.Dueno,
      EPerfilUsuario.Supervisor,
      EPerfilUsuario.Metre,
      EPerfilUsuario.Mozo,
      EPerfilUsuario.Cocinero,
      EPerfilUsuario.Cantinero

    ].includes(
      perfil as EPerfilUsuario
    );
  }

  async register(
    request: any,
    role: EPerfilUsuario
  ): Promise<void> {

    const avatarUrl =
      await this._storageService.uploadImage(
        request.profile.file
      );

    const { error } =
      await this._supabaseService.client.auth.signUp({

        email: request.credentials.email,

        password: request.credentials.password,

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
  }

  async iniciarsecion(
    request: any
  ) {

    const { data, error } =
      await this._supabaseService.client.auth.signInWithPassword({

        email: request.email,

        password: request.password,

      });

    if (error) {
      throw new Error(
        `Login failed: ${error.message}`
      );
    }

    if (!data.user) {
      throw new Error(
        'Login failed: no user returned'
      );
    }

    this.usuarioActual.set(data.user);

    return data.user;
  }

  async logout(): Promise<void> {

    await this._supabaseService.client.auth.signOut();

    this.usuarioActual.set(null);
  }

  estaLogueado(): boolean {

    return this.usuarioActual() !== null;
  }
}