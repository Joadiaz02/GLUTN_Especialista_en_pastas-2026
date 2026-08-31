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
      environment.supabaseKey,
    );
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  uploadAvatar(filePath: string, file: File) {
    return this.supabase.storage.from('images').upload(filePath, file);
  }

  getAvatarUrl(filePath: string) {
    return this.supabase.storage.from('images').getPublicUrl(filePath);
  }
}
