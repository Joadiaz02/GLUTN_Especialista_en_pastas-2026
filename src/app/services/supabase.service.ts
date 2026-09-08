import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  async uploadAvatar(filePath: string, file: File) {
    const { data, error } = await this.supabase.storage
      .from('images')
      .upload(filePath, file, {
        contentType: file.type,
      });

    if (error) {
      throw error;
    }

    return data;
  }

  getAvatarUrl(filePath: string) {
    return this.supabase.storage.from('images').getPublicUrl(filePath);
  }
}
