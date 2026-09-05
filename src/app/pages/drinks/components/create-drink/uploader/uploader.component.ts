import { Component, inject, output, signal } from '@angular/core';
import {
  IonIcon,
  ModalController,
  ToastController,
} from '@ionic/angular';
import { UploadOptionsComponent } from './upload-options/upload-options.component';
import { Camera, MediaResult } from '@capacitor/camera';

@Component({
  selector: 'app-uploader',
  templateUrl: './uploader.component.html',
  styleUrls: ['./uploader.component.scss'],
  imports: [IonIcon],
})
export class UploaderComponent {
  uploading = signal<boolean>(false);
  photoPreview = signal<string | null>(null);

  fileSelected = output<File>();

  private _toastController = inject(ToastController);
  private _modalController = inject(ModalController);

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
      this.showErrorToast();
    }
  }

  async selectFromGallery() {
    try {
      const result = await Camera.chooseFromGallery({
        includeMetadata: true,
      });

      const media = result.results?.[0];

      if (media) {
        await this.processPhoto(media);
      }
    } catch (err) {
      this.showErrorToast();
    }
  }

  private async processPhoto(photo: MediaResult) {
    this.photoPreview.set(photo.webPath ?? null);

    if (photo.webPath) {
      const response = await fetch(photo.webPath);
      const blob = await response.blob();

      const format = photo.metadata?.format ?? 'jpeg';
      const file = new File([blob], `profile-${Date.now()}.${format}`, {
        type: `image/${format}`,
      });

      this.fileSelected.emit(file);
    }
  }

  private async showErrorToast() {
    const toast = await this._toastController.create({
      message:
        'Ocurrió un problema al guardar tu información. Intentá nuevamente.',
      duration: 5000,
      position: 'top',
    });

    await toast.present();
  }
}
