import {
  Component,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';

import {
  IonIcon,
  ModalController,
  ToastController,
} from '@ionic/angular';

import {
  Camera,
  MediaResult,
} from '@capacitor/camera';

import { UploadOptionsComponent } from './upload-options/upload-options.component';

import { LoadingOverlayComponent } from '../loading-overlay/loading-overlay.component';

import { Vibracion } from '@app/services';

@Component({
  selector: 'app-uploader',
  templateUrl: './uploader.component.html',
  styleUrls: ['./uploader.component.scss'],
  imports: [
    IonIcon,
    LoadingOverlayComponent,
  ],
})
export class UploaderComponent implements OnInit {

  uploading = signal<boolean>(false);

  photoPreview = signal<string | null>(null);

  fileSelected = output<File>();

  image = input<string | null>(null);

  onlyTake = input<boolean>(false);


  private readonly _toastController =
    inject(ToastController);

  private readonly _modalController =
    inject(ModalController);

  private readonly _vibracion =
    inject(Vibracion);


  ngOnInit(): void {
    this.photoPreview.set(
      this.image()
    );
  }


  async open(): Promise<void> {

    if (this.onlyTake()) {
      await this.takePhoto();
      return;
    }

    const modal =
      await this._modalController.create({
        component:
          UploadOptionsComponent,

        cssClass:
          'upload-options-modal',
      });

    await modal.present();

    const {
      data,
      role,
    } = await modal.onWillDismiss();


    if (
      role === 'confirm' &&
      data?.source === 'camera'
    ) {

      await this.takePhoto();

      return;
    }


    if (
      role === 'confirm' &&
      data?.source === 'gallery'
    ) {

      await this.selectFromGallery();

    }
  }


  async takePhoto(): Promise<void> {

    this.uploading.set(true);

    try {

      const photo =
        await Camera.takePhoto({
          quality: 60,
          editable: 'no',
          includeMetadata: true,
        });

      await this.processPhoto(photo);

    } catch (error) {

      await this.showErrorToast();

    } finally {

      this.uploading.set(false);

    }
  }


  async selectFromGallery(): Promise<void> {

    this.uploading.set(true);

    try {

      const result =
        await Camera.chooseFromGallery({
          includeMetadata: true,
        });

      const media =
        result.results?.[0];

      if (media) {
        await this.processPhoto(media);
      }

    } catch (error) {

      await this.showErrorToast();

    } finally {

      this.uploading.set(false);

    }
  }


  private async processPhoto(
    photo: MediaResult
  ): Promise<void> {

    this.photoPreview.set(
      photo.webPath ?? null
    );


    const base64Src =
      photo.thumbnail;


    if (!base64Src) {
      return;
    }


    let format =
      (
        photo.metadata?.format ??
        'jpeg'
      ).toLowerCase();


    if (format === 'jpg') {
      format = 'jpeg';
    }


    const cleanBase64 =
      base64Src.replace(
        /^data:image\/\w+;base64,/,
        ''
      );


    const byteCharacters =
      atob(cleanBase64);


    const byteNumbers =
      new Array(
        byteCharacters.length
      );


    for (
      let i = 0;
      i < byteCharacters.length;
      i++
    ) {

      byteNumbers[i] =
        byteCharacters.charCodeAt(i);

    }


    const byteArray =
      new Uint8Array(
        byteNumbers
      );


    const blob =
      new Blob(
        [byteArray],
        {
          type: `image/${format}`,
        }
      );


    const file =
      new File(
        [blob],
        `table-${Date.now()}.${format}`,
        {
          type: `image/${format}`,
        }
      );


    this.fileSelected.emit(file);
  }


  private async showErrorToast(): Promise<void> {

    await this._vibracion.error();


    const toast =
      await this._toastController.create({
        message:
          'Ocurrió un problema al cargar la imagen. Intentá nuevamente.',
        duration: 5000,
        position: 'top',
      });


    await toast.present();
  }
}