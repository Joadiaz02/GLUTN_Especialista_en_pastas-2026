import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../supabase.service';

@Injectable({ providedIn: 'root' })
export class Storage {
  private _supabaseService = inject(SupabaseService);

  async uploadImage(file: File): Promise<string> {
    const ext = file.name.split('.').pop();
    const path = `${crypto.randomUUID()}.${ext}`;

    console.log("Storage Service")
    console.log(file)

    await this._supabaseService.uploadAvatar(path, file);

    return this._supabaseService.getAvatarUrl(path).data.publicUrl;
  }
}