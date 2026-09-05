import { Component, inject, signal } from '@angular/core';
import {
  IonIcon,
  IonModal,
  ModalController,
  ToastController,
} from '@ionic/angular';
import { UploadOptionsComponent } from './upload-options/upload-options.component';
import { Camera, CameraSource } from '@capacitor/camera';

@Component({
  selector: 'app-uploader',
  templateUrl: './uploader.component.html',
  styleUrls: ['./uploader.component.scss'],
  imports: [IonIcon],
})
export class UploaderComponent {
  uploading = signal<boolean>(false);
  photoPreview = signal<string | null>(null);

  private _toastController = inject(ToastController);
  private _modalController = inject(ModalController);

  async open() {
    const modal = await this._modalController.create({
      component: UploadOptionsComponent,
      cssClass: 'upload-options-modal',
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm' && data?.source) {
      this.takePhoto(
        data.source === 'camera' ? CameraSource.Camera : CameraSource.Photos
      );
    }
  }

  async takePhoto(source: CameraSource) {
    try {
      const photo = await Camera.takePhoto({
        quality: 60,
        editable: 'no',
      });

      this.photoPreview.set(photo.webPath ?? null);

      if (photo.webPath) {
        const response = await fetch(photo.webPath);
        const blob = await response.blob();

        const format = photo.metadata?.format ?? 'jpeg';
        const file = new File([blob], `profile-${Date.now()}.${format}`, {
          type: `image/${format}`,
        });

        // this.formGroup.patchValue({ file });
      }
    } catch (err) {
      const toast = await this._toastController.create({
        message:
          'Ocurrió un problema al guardar tu información. Intentá nuevamente.',
        duration: 5000,
        position: 'top',
      });

      await toast.present();
    }
  }
}
