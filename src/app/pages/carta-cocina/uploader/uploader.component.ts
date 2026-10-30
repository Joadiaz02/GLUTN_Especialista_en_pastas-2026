import { Component, inject, input, output, signal } from '@angular/core';
import { IonIcon, ModalController, ToastController } from '@ionic/angular';
import { UploadOptionsComponent } from '@app/components/ui/uploader/upload-options/upload-options.component';
import { Camera, MediaResult } from '@capacitor/camera';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { Vibracion } from '@app/services/vibracion/vibracion';
@Component({
  selector: 'app-uploader',
  templateUrl: './uploader.component.html',
  styleUrls: ['./uploader.component.scss'],
  imports: [IonIcon, SpinnerLogoComponent],
})
export class UploaderComponent {
  // foto actual del plato al editar
  initialPreview = input<string | null>(null);

  uploading = signal<boolean>(false);
  photoPreview = signal<string | null>(null);

  fileSelected = output<File>();

  private _toastController = inject(ToastController);
  private _modalController = inject(ModalController);
  private _vibracion = inject(Vibracion);

  async open() {
    const modal = await this._modalController.create({
      component: UploadOptionsComponent,
      cssClass: 'upload-options-modal',
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm' && data?.source === 'camera') {
      this.takePhoto();
    } else if (role === 'confirm' && data?.source === 'gallery') {
      this.selectFromGallery();
    }
  }

  async takePhoto() {
    try {
      const photo = await Camera.takePhoto({
        quality: 60,
        editable: 'no',
        includeMetadata: true,
      });

      await this.processPhoto(photo);
    } catch (err) {
      await this.avisarError(err);
    }
  }

  async selectFromGallery() {
    this.uploading.set(true);
    try {
      const result = await Camera.chooseFromGallery({
        includeMetadata: true,
      });

      const media = result.results?.[0];

      if (media) {
        await this.processPhoto(media);
      }
    } catch (err) {
      await this.avisarError(err);
    } finally {
      this.uploading.set(false);
    }
  }

  private async processPhoto(photo: MediaResult) {
    this.photoPreview.set(photo.webPath ?? null);

    const base64Src = photo.thumbnail;

    if (base64Src) {
      let format = (photo.metadata?.format ?? 'jpeg').toLowerCase();
      if (format === 'jpg') format = 'jpeg';

      const cleanBase64 = base64Src.replace(/^data:image\/\w+;base64,/, '');
      const byteCharacters = atob(cleanBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      const blob = new Blob([byteArray], { type: `image/${format}` });
      const file = new File([blob], `table-${Date.now()}.${format}`, {
        type: `image/${format}`,
      });

      this.fileSelected.emit(file);
    }
  }

  // si el usuario cerró la cámara o la galería no es un error
  private async avisarError(err: unknown) {
    const mensaje = err instanceof Error ? err.message : String(err ?? '');

    if (/cancel/i.test(mensaje)) {
      return;
    }

    await this._vibracion.error();

    const toast = await this._toastController.create({
      message: 'No pudimos cargar la foto. Intentá nuevamente.',
      duration: 5000,
      position: 'top',
      color: 'danger',
    });

    await toast.present();
  }
}
