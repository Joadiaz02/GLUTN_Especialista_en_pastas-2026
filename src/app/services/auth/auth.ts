import { inject, Service } from '@angular/core';
import { SupabaseService } from '../supabase.service';


@Service()
export class Auth {

  providedIn?: 'root'

  private supabaseService = inject(SupabaseService);
  usuarioActual: any = null;

  constructor() {
    this.restaurarSesion();
  }
  //guarda la sesion
  private async restaurarSesion() {
    const { data } = await this.supabaseService.client.auth.getSession();//metodo de persistencia
    if (data.session) {
      this.usuarioActual = data.session.user;
    }
  }

  async iniciarsesion(email: string, contrasena: string) {
    const { data, error } = await this.supabaseService.client.auth.signInWithPassword({
      email,
      password: contrasena
    });

    if (!error && data.user) {
      this.usuarioActual = data.user;
    }

    return { data, error };
  }
  //cierra sesion
  async logout() {
    await this.supabaseService.client.auth.signOut();
    this.usuarioActual = null;
  }

  estaLogueado(): boolean {
    return this.usuarioActual !== null;
    }
}
