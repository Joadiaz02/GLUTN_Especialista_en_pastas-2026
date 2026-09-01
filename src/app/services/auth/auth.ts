import { inject, Service } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { EPerfilUsuario } from '@app/enums';
import { Storage } from '../storage';

@Service()
export class Auth {
  private _supabaseService = inject(SupabaseService);
  private _storageService = inject(Storage);
  usuarioActual: any = null;

  constructor() {
    this.restaurarSesion();
  }

  private async restaurarSesion() {
    const { data } = await this._supabaseService.client.auth.getSession();
    if (data.session) {
      this.usuarioActual = data.session.user;
    }
  }

  async register(request: any, role: EPerfilUsuario): Promise<void> {
    const avatarUrl = await this._storageService.uploadImage(
      request.profile.file
    );

    const { error } = await this._supabaseService.client.auth.signUp({
      email: request.credentials.email,
      password: request.credentials.password,
      options: {
        data: {
          apellido: request.personal.lastName,
          nombre: request.personal.name,
          documento: request.personal.dni,
          perfil: role,
          avatar: avatarUrl,
        },
      },
    });

    if (error) {
      throw error;
    }
  }

  async iniciarsecion(request: any) {
    const { data, error } =
      await this._supabaseService.client.auth.signInWithPassword({
        email: request.email,
        password: request.password,
      });

    if (error) throw new Error(`Login failed: ${error.message}`);
    if (!data.user) throw new Error('Login failed: no user returned');

    this.usuarioActual = data.user;
    return data.user;
  }

  async logout() {
    await this._supabaseService.client.auth.signOut();
    this.usuarioActual = null;
  }

  estaLogueado(): boolean {
    return this.usuarioActual !== null;
  }
}