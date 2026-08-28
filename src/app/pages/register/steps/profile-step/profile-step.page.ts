import { Component, inject, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { Camera } from '@capacitor/camera';
import { IonButton, IonIcon, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-profile-step',
  templateUrl: './profile-step.page.html',
  styleUrls: ['./profile-step.page.scss'],
  imports: [CommonModule, ReactiveFormsModule, IonButton, IonIcon],
})
export class ProfileStepPage {
  @Input() control!: AbstractControl;

  uploading = signal(false);
  photoPreview = signal<string | null>(null);

  private _toastController = inject(ToastController);

  get formGroup(): FormGroup {
    return this.control as FormGroup;
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
