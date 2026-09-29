import { Component, inject, input, OnInit, output, signal, } from '@angular/core';
import { IonIcon, ModalController, ToastController } from '@ionic/angular';
import { UploadOptionsComponent } from './upload-options/upload-options.component';
import { Camera, MediaResult } from '@capacitor/camera';
import { SpinnerLogoComponent } from '../spinner-logo/spinner-logo.component';
import { Vibracion } from '@app/services';
@Component({
  selector: 'app-uploader',
  templateUrl: './uploader.component.html',
  styleUrls: ['./uploader.component.scss'],
  imports: [IonIcon, SpinnerLogoComponent, ],
})
export class UploaderComponent implements OnInit {
  uploading = signal<boolean>(false);
  photoPreview = signal<string | null>(null);

  fileSelected = output<File>();
  image = input<string | null>(null);
  onlyTake = input<boolean>(false);

  private _toastController = inject(ToastController);
  private _modalController = inject(ModalController);
  private _vibracion = inject(Vibracion);

  ngOnInit() {
    this.photoPreview.set(this.image());
  }

  async open() {
    if (this.onlyTake()) {
      this.takePhoto();
    } else {
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

  }

  async takePhoto() {

  this.uploading.set(true);

  try {

    const photo =
      await Camera.takePhoto({
        quality: 60,
        editable: 'no',
        includeMetadata: true,
      });

    await this.processPhoto(photo);

  } catch (err) {
    await this.showErrorToast();

  } finally {

    this.uploading.set(false);

  }
}

  async selectFromGallery() {

  this.uploading.set(true);

  try {

    const result =
      await Camera.chooseFromGallery({
        includeMetadata: true,
      });
    const media = result.results?.[0];
    if (media) {
      await this.processPhoto(media);
    }

  } catch (err) {
    await this.showErrorToast();

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

  private async showErrorToast() {
    await this._vibracion.error();
    const toast = await this._toastController.create({
      message:
        'Ocurrió un problema al guardar tu información. Intentá nuevamente.',
      duration: 5000,
      position: 'top',
    });

    await toast.present();
  }
}
