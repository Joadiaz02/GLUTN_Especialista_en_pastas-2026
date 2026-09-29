import { Component, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { IonInput, IonButton, IonIcon, ToastController } from '@ionic/angular';
import { Camera } from '@capacitor/camera';
import { Vibracion } from '@app/services';
@Component({
  selector: 'app-identity-step',
  templateUrl: './identity-step.page.html',
  styleUrls: ['./identity-step.page.scss'],
  imports: [CommonModule, ReactiveFormsModule, IonInput, IonButton, IonIcon],
})
export class IdentityStepPage {
  control = input<AbstractControl>();

  uploading = signal(false);
  photoPreview = signal<string | null>(null);

  private _toastController = inject(ToastController);
  private _vibracion = inject(Vibracion);

  get formGroup(): FormGroup {
    return this.control() as FormGroup;
  }

  getFormControl(controlName: string) {
    return this.formGroup.get(controlName);
  }

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

        this.formGroup.patchValue({ file });
      }
    } catch (err) {
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
}
