import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;

  private statelessSupabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );

    this.statelessSupabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: 'stateless-signup-client',
        },
      }
    );
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  get statelessClient(): SupabaseClient {
    return this.statelessSupabase;
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
