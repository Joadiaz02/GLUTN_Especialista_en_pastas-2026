import { inject, Service } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { Storage } from '../storage/storage';

@Service()
export class Auth {
  private _supabaseService = inject(SupabaseService);
  private _storageService = inject(Storage);

  async register(request: any, role: any): Promise<void> {
    const avatarUrl = await this._storageService.uploadImage(
      request.profile.file,
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
}