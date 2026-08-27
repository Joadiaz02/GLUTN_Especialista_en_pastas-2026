import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { IonButton, IonInput, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { scan } from 'ionicons/icons';
import {
  BarcodeScanner,
  BarcodeFormat,
} from '@capacitor-mlkit/barcode-scanning';

@Component({
  selector: 'app-personal-step',
  templateUrl: './personal-step.page.html',
  styleUrls: ['./personal-step.page.scss'],
  imports: [CommonModule, ReactiveFormsModule, IonInput, IonButton, IonIcon],
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

  constructor() {
    addIcons({ scan });
  }

  async scanDNI() {
    this.scanError = null;

    const permission = await BarcodeScanner.checkPermissions();

    if (permission.camera !== 'granted') {
      const requested = await BarcodeScanner.requestPermissions();

      if (requested.camera !== 'granted') {
        this.scanError = 'Necesitamos acceso a la cámara para escanear el DNI.';

        return;
      }
    }

    try {
      this.scanning = true;

      const { barcodes } = await BarcodeScanner.scan({
        formats: [BarcodeFormat.Pdf417],
      });

      if (barcodes.length === 0) {
        this.scanError = 'No se detectó ningún código. Probá de nuevo.';
        return;
      }

      this.parseBarcode(barcodes[0].rawValue);
    } catch (err) {
      this.scanError = 'Ocurrió un error al escanear. Intentá nuevamente.';
    } finally {
      this.scanning = false;
    }
  }

  private parseBarcode(raw: any) {
    const fields = raw.split('@');

    if (fields.length < 5) {
      this.scanError = 'The scanned code does not match the expected format.';
      return;
    }

    const dni = fields[4];

    this.formGroup.patchValue({
      dni: dni,
    });
  }
}
