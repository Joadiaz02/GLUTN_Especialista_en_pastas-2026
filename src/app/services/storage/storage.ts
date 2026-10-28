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

  // copia a nuestro almacenamiento una foto externa (Google, Discord) para no depender del enlace
  async subirImagenDesdeUrl(url: string): Promise<string> {
    const respuesta = await fetch(url);

    if (!respuesta.ok) {
      throw new Error(`No se pudo descargar la imagen (${respuesta.status}).`);
    }

    const blob = await respuesta.blob();
    const tipo = blob.type.startsWith('image/') ? blob.type : 'image/png';
    const ext = tipo.split('/')[1].replace('jpeg', 'jpg');

    const file = new File([blob], `perfil-${Date.now()}.${ext}`, { type: tipo });

    return this.uploadImage(file);
  }
}