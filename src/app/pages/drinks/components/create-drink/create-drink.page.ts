import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonFooter,
  IonIcon,
  ToastController,
  IonInput,
} from '@ionic/angular';
import { Camera } from '@capacitor/camera';
import { UploaderComponent } from './uploader/uploader.component';

@Component({
  selector: 'app-create-drink',
  templateUrl: './create-drink.page.html',
  styleUrls: ['./create-drink.page.scss'],
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonButtons,
    IonBackButton,
    IonButton,
    IonFooter,
    IonInput,

    UploaderComponent,
  ],
})
export class CreateDrinkPage {
  uploading = signal(false);
  photoPreview = signal<string | null>(null);

  private _toastController = inject(ToastController);

  async takePhoto() {
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
