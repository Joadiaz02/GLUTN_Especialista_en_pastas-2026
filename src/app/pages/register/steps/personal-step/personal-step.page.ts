import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { IonInput, ToastController } from '@ionic/angular';
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
  imports: [CommonModule, ReactiveFormsModule, IonInput],
})
export class PersonalStepPage {
  @Input() control!: AbstractControl;

  private _toastController = inject(ToastController);

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

    try {
      const permission = await BarcodeScanner.checkPermissions();

      if (permission.camera !== 'granted') {
        const requested = await BarcodeScanner.requestPermissions();

        if (requested.camera !== 'granted') {
          const toast = await this._toastController.create({
            message: 'Necesitamos acceso a la cámara para escanear el DNI.',
            duration: 5000,
            position: 'top',
          });

          await toast.present();

          return;
        }
      }

      const { available } =
        await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();

      if (!available) {
        this.scanning = true;

        await BarcodeScanner.installGoogleBarcodeScannerModule();
      }

      this.scanning = true;

      const { barcodes } = await BarcodeScanner.scan({
        formats: [BarcodeFormat.Pdf417],
      });

      if (barcodes.length === 0) {
        const toast = await this._toastController.create({
          message: 'No se detectó ningún código. Probá de nuevo.',
          duration: 5000,
          position: 'top',
        });

        await toast.present();

        return;
      }

      this.parseBarcode(barcodes[0].rawValue);
    } catch (err) {
      const toast = await this._toastController.create({
        message: 'Ocurrió un problema al escanear. Intentá nuevamente.',
        duration: 5000,
        position: 'top',
      });

      await toast.present();
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
