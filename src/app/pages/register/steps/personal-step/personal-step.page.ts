import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';

import {
  IonButton,
  IonInput,
  IonIcon,
} from '@ionic/angular';

import {
  BarcodeScanner,
  BarcodeFormat,
} from '@capacitor-mlkit/barcode-scanning';

@Component({
  selector: 'app-personal-step',
  templateUrl: './personal-step.page.html',
  styleUrls: ['./personal-step.page.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonInput,
    IonButton,
    IonIcon,
  ],
})
export class PersonalStepPage {
  @Input() control!: AbstractControl;

  scanning = false;
  scanError: string | null = null;

  get formGroup(): FormGroup {
    return this.control as FormGroup;
  }

  getFormControl(controlName: string) {
    return this.formGroup.get(controlName);
  }

  async scanDNI(): Promise<void> {
    this.scanError = null;

    const permission =
      await BarcodeScanner.checkPermissions();

    if (permission.camera !== 'granted') {
      const requested =
        await BarcodeScanner.requestPermissions();

      if (requested.camera !== 'granted') {
        this.scanError =
          'Necesitamos acceso a la cámara para escanear el DNI.';

        return;
      }
    }

    try {
      this.scanning = true;

      const { barcodes } =
        await BarcodeScanner.scan({
          formats: [BarcodeFormat.Pdf417],
        });

      if (barcodes.length === 0) {
        this.scanError =
          'No se detectó ningún código. Probá de nuevo.';

        return;
      }

      this.parseBarcode(
        barcodes[0].rawValue,
      );
    } catch (error) {
      this.scanError =
        'Ocurrió un error al escanear. Intentá nuevamente.';
    } finally {
      this.scanning = false;
    }
  }

  private parseBarcode(raw: any): void {
    const fields = raw.split('@');

    if (fields.length < 5) {
      this.scanError =
        'El código escaneado no tiene el formato esperado.';

      return;
    }

    const lastName =
      fields[1]?.trim() ?? '';

    const name =
      fields[2]?.trim() ?? '';

    const dni =
      fields[4]?.trim() ?? '';

    this.formGroup.patchValue({
      lastName,
      name,
      dni,
    });

    const nameControl =
      this.formGroup.get('name');

    const lastNameControl =
      this.formGroup.get('lastName');

    const dniControl =
      this.formGroup.get('dni');

    nameControl?.markAsDirty();
    nameControl?.markAsTouched();
    nameControl?.updateValueAndValidity();

    lastNameControl?.markAsDirty();
    lastNameControl?.markAsTouched();
    lastNameControl?.updateValueAndValidity();

    dniControl?.markAsDirty();
    dniControl?.markAsTouched();
    dniControl?.updateValueAndValidity();

    this.formGroup.updateValueAndValidity();
  }
}