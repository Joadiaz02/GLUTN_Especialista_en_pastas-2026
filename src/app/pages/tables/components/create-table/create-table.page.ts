import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonIcon, IonFooter, IonButton, IonInput } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { Router } from '@angular/router';
import { GtnUploader } from '@app/components';

type TipoMesa = 'vip' | 'estandar' | 'movilidad_reducida';

@Component({
  selector: 'app-create-table',
  templateUrl: './create-table.page.html',
  styleUrls: ['./create-table.page.scss'],
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonIcon,
    CommonModule,
    FormsModule,
    ConfirmVolverComponent,
    IonFooter,
    IonButton,
    IonInput,
    GtnUploader
],
})
export class CreateTablePage {
  private _router = inject(Router);
  // private _mesasService = inject(MesasService); // TODO: conectar con Supabase

  readonly types: any[] = [
    { type: 'estandar', value: 'Estándar', },
    { type: 'vip_movilidad_reducida', value: 'VIP con Movilidad reducida' },
    { type: 'vip', value: 'VIP', },
    { type: 'movilidad_reducida', value: 'Movilidad reducida' },
  ];

  numero = signal<number | null>(this._proximoNumeroSugerido());
  comensales = signal(2);
  tipo = signal<TipoMesa | null>(null);
  fotoPreview = signal<string | null>(null);
  guardando = signal(false);
  errores = signal<Record<string, string>>({});

  private _fotoBase64: string | null = null;

  private _proximoNumeroSugerido(): number {
    // TODO: reemplazar por SELECT max(numero) + 1 de la tabla `mesas` en Supabase
    return 1;
  }

  incrementarComensales(): void {
    this.comensales.update((c) => Math.min(c + 1, 20));
  }

  decrementarComensales(): void {
    this.comensales.update((c) => Math.max(c - 1, 1));
  }

  seleccionarTipo(valor: TipoMesa): void {
    this.tipo.set(valor);
  }

  onPhotoSelected(index: number, file: File) {
    // this.photosArray.at(index).setValue(file);
  }

  async tomarFoto(): Promise<void> {
    try {
      const foto = await Camera.getPhoto({
        quality: 80,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera, // solo cámara, sin opción de galería
      });
      this._fotoBase64 = foto.base64String ?? null;
      this.fotoPreview.set(`data:image/${foto.format};base64,${foto.base64String}`);
    } catch {
      // el usuario canceló la captura, no hacemos nada
    }
  }

  private _validar(): boolean {
    const errores: Record<string, string> = {};

    if (!this.numero() || this.numero()! <= 0) {
      errores['numero'] = 'Ingresá un número de mesa válido.';
    }
    if (!this.tipo()) {
      errores['tipo'] = 'Seleccioná un tipo de mesa.';
    }
    if (!this._fotoBase64) {
      errores['foto'] = 'Sacá una foto de la mesa.';
    }

    this.errores.set(errores);
    return Object.keys(errores).length === 0;
  }

  async guardar(): Promise<void> {
    if (!this._validar()) {
      return;
    }

    this.guardando.set(true);
    try {
      // TODO: subir this._fotoBase64 a Supabase Storage → obtener foto_url
      // TODO: insert en `mesas`:
      // { numero: this.numero(), comensales: this.comensales(), tipo: this.tipo(),
      //   disponibilidad: 'vacia', foto_url }
      // El QR se genera al vuelo con el id devuelto (no se guarda en la tabla).

      await this._router.navigate(['/admin']);
    } finally {
      this.guardando.set(false);
    }
  }

  volver(): void {
    void this._router.navigate(['/admin/tables']);
  }
}