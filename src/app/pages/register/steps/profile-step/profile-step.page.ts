import {
  Component,
  Input,
  signal,
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  AbstractControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';

import { Camera } from '@capacitor/camera';

@Component({
  selector: 'app-profile-step',
  templateUrl: './profile-step.page.html',
  styleUrls: ['./profile-step.page.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
  ],
})
export class ProfileStepPage {
  @Input() control!: AbstractControl;

  photoPreview =
    signal<string | null>(null);

  photoError:
    string | null = null;

  get formGroup(): FormGroup {
    return this.control as FormGroup;
  }

  getFormControl(controlName: string) {
    return this.formGroup.get(controlName);
  }

  async takePhoto(): Promise<void> {
    this.photoError = null;

    try {
      const photo =
        await Camera.takePhoto({
          quality: 100,
          editable: "no",
          includeMetadata: true,
        });

      this.photoPreview.set(
        photo.webPath ?? null,
      );

      if (!photo.webPath) {
        return;
      }

      const response =
        await fetch(photo.webPath);

      const blob =
        await response.blob();

      const format =
        photo.metadata?.format ?? 'jpeg';

      const file = new File(
        [blob],
        `profile-${Date.now()}.${format}`,
        {
          type: `image/${format}`,
        },
      );

      const fileControl =
        this.formGroup.get('file');

      fileControl?.setValue(file);

      fileControl?.markAsDirty();

      fileControl?.markAsTouched();

      fileControl?.updateValueAndValidity();

      this.formGroup.updateValueAndValidity();

    } catch (error) {
      this.photoError =
        'No se pudo obtener la foto. Intentá nuevamente.';
    }
  }
}