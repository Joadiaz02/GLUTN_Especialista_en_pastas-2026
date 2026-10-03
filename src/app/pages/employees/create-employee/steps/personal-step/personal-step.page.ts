import { Component, inject, Input, signal } from '@angular/core';
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
import { CuilFormat } from '@app/directives';

@Component({
  selector: 'app-personal-step',
  templateUrl: './personal-step.page.html',
  styleUrls: ['./personal-step.page.scss'],
  imports: [CommonModule, ReactiveFormsModule, IonInput, DniFormat, CuilFormat, IonIcon],
})
export class PersonalStepPage {
  @Input() control!: AbstractControl;

  private _toastController = inject(ToastController);
  private _vibracion = inject(Vibracion);

  readonly types: any[] = [
    { type: 'metre' },
    { type: 'cantinero' },
    { type: 'cocinero' },
    { type: 'mozo' },
  ];

  typeSelected = signal('');

  scanning = false;
  scanError: string | null = null;

  get formGroup(): FormGroup {
    return this.control as FormGroup;
  }

  getFormControl(controlName: string) {
    return this.formGroup.get(controlName);
  }

  selectType(value: any): void {
    this.typeSelected.set(value);

    console.log(value)

    this.getFormControl('role')?.setValue(value);
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

      console.log("personal-step.page.ts 90")
      console.log(barcodes)
      console.log(barcodes[0])
      console.log(barcodes[0]?.rawValue)
      console.log("personal-step.page.ts 90")

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
    console.log('personal-step.page.ts 119');
    console.log(raw);

    const fields = raw.split('@');
    console.log('personal-step.page.ts 123');
    console.log(fields);

    const parsed = this.extractDniData(raw);

    if (!parsed) {
      this.scanError = 'El código escaneado no tiene el formato esperado.';
      return;
    }

    this.scanError = null;

    this.formGroup.patchValue({
      lastName: parsed.lastName,
      name: parsed.name,
      dni: parsed.dni,
      cuil: this.calculateCuil(parsed.dni, parsed.gender),
    });

    // if (fields.length < 5) {
    //   this.scanError = 'El código escaneado no tiene el formato esperado.';

    //   return;
    // }

    // const lastName = fields[1]?.trim() ?? '';

    // const name = fields[2]?.trim() ?? '';

    // const dni = fields[4]?.trim() ?? '';

    // this.formGroup.patchValue({
    //   lastName,
    //   name,
    //   dni,
    // });
  }

  private extractDniData(raw: string) {
    if (raw.includes('@')) {
      return this.parseNewDni(raw);
    }

    if (raw.includes('"')) {
      return this.parseOldDni(raw);
    }

    return null;
  }

  private parseNewDni(raw: string) {
    const fields = raw.split('@');

    if (fields.length < 5) return null;

    const dni = fields[4]?.trim() ?? '';

    if (!/^\d{7,8}$/.test(dni)) return null;

    return {
      lastName: fields[1]?.trim() ?? '',
      name: fields[2]?.trim() ?? '',
      gender: fields[3]?.trim().toUpperCase() ?? '',
      dni,
    };
  }

  private parseOldDni(raw: string) {
    const fields = raw
      .split('"')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    const dni = fields.find((f) => /^\d{7,8}$/.test(f));
    const gender = fields.find((f) => /^[MF]$/i.test(f));

    const textFields = fields.filter(
      (f) => f.length > 1 && /^[A-ZÁÉÍÓÚÜÑ' .-]+$/i.test(f)
    );

    if (!dni || !gender || textFields.length < 2) return null;

    return {
      lastName: textFields[0],
      name: textFields[1],
      gender: gender.toUpperCase(),
      dni,
    };
  }

  private calculateCuil(dni: string, gender: string): string {
    const paddedDni = dni.padStart(8, '0');
    const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let prefix = gender === 'F' ? '27' : '20';

    const getRemainder = (pref: string): number =>
      (pref + paddedDni)
        .split('')
        .reduce((sum, digit, i) => sum + Number(digit) * weights[i], 0) % 11;

    const remainder = getRemainder(prefix);
    let checkDigit: number;

    if (remainder === 0) {
      checkDigit = 0;
    } else if (remainder === 1) {
      checkDigit = prefix === '20' ? 9 : 4;
      prefix = '23';
    } else {
      checkDigit = 11 - remainder;
    }

    return `${prefix}${paddedDni}${checkDigit}`;
  }
}
