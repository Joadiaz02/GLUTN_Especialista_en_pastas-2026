import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { IonInput, ToastController, IonIcon } from '@ionic/angular';
import {
  BarcodeScanner,
  BarcodeFormat,
} from '@capacitor-mlkit/barcode-scanning';
import { DniFormat } from '@app/directives/dni-format/dni-format';
import { Vibracion } from '@app/services';

@Component({
  selector: 'app-personal-step',
  templateUrl: './personal-step.page.html',
  styleUrls: ['./personal-step.page.scss'],
  imports: [CommonModule, ReactiveFormsModule, IonInput, DniFormat, IonIcon],
})
export class PersonalStepPage {
  @Input() control!: AbstractControl;

  private _toastController = inject(ToastController);
  private _vibracion = inject(Vibracion);
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

    try {
      this.scanning = true;

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
      await this._vibracion.error();
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

  private parseBarcode(raw: any): void {
    const fields = raw.split('@');

    if (fields.length < 5) {
      this.scanError = 'El código escaneado no tiene el formato esperado.';

      return;
    }

    const lastName = fields[1]?.trim() ?? '';

    const name = fields[2]?.trim() ?? '';

    const dni = fields[4]?.trim() ?? '';

    this.formGroup.patchValue({
      lastName,
      name,
      dni,
    });
  }
}
