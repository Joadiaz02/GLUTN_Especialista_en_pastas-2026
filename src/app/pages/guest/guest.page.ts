import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonFooter,
  IonButton,
  ToastController,
} from '@ionic/angular';
import { ProgressBarComponent } from '@app/components';
import { IdentityStepPage } from './steps/identity-step/identity-step.page';
import { LocationStepPage } from './steps/location-step/location-step.page';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Router } from '@angular/router';
import { Auth, Waitlist } from '@app/services';
import { fullNameValidator } from '@app/validators';

@Component({
  selector: 'app-guest',
  templateUrl: './guest.page.html',
  styleUrls: ['./guest.page.scss'],
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    IonButtons,
    IonBackButton,
    ProgressBarComponent,
    IonFooter,
    IonButton,
    IdentityStepPage,
    ReactiveFormsModule,
    LocationStepPage,
  ],
})
export class GuestPage {
  private _toastController = inject(ToastController);
  private _router = inject(Router);
  private _waitlistService = inject(Waitlist);
  private _authService = inject(Auth);

  scanning = signal<boolean>(false);

  form = new FormGroup({
    file: new FormControl<File | null>(null, Validators.required),

    fullName: new FormControl(
      '',
      [
  Validators.required,
  Validators.maxLength(60),
  fullNameValidator(),
]
    ),

    comensales: new FormControl(
      1,
      [
        Validators.required,
        Validators.min(1),
        Validators.max(20),
      ]
    ),

    consideraciones: new FormControl<string[]>([]),
  });

  currentStep = signal<number>(1);

  getStepTitle(): string {
    switch (this.currentStep()) {
      case 1:
        return 'Invitado';

      case 2:
        return 'Escaneo';

      default:
        return '';
    }
  }

  ajustarComensales(delta: number): void {
    const actual =
      this.form.controls.comensales.value ?? 1;

    const siguiente = Math.min(
      20,
      Math.max(1, actual + delta)
    );

    this.form.controls.comensales.setValue(
      siguiente
    );
  }

  tieneConsideracion(valor: string): boolean {
    return (
      this.form.controls.consideraciones.value?.includes(
        valor
      ) ?? false
    );
  }

  toggleConsideracion(valor: string): void {
    const actual =
      this.form.controls.consideraciones.value ?? [];

    const siguiente = actual.includes(valor)
      ? actual.filter(
          (item) => item !== valor
        )
      : [...actual, valor];

    this.form.controls.consideraciones.setValue(
      siguiente
    );
  }

  nextStep(): void {
    const step = this.currentStep();

    if (step < 3) {
      this.currentStep.update(
        (current) => current + 1
      );
    }
  }

  previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update(
        (current) => current - 1
      );
    }
  }

  async scanQR(): Promise<void> {
    const { camera } =
      await BarcodeScanner.requestPermissions();

    if (
      camera !== 'granted' &&
      camera !== 'limited'
    ) {
      await this._showError(
        'Necesitamos permiso de cámara para escanear el código.'
      );

      return;
    }

    const { barcodes } =
      await BarcodeScanner.scan();

    if (barcodes.length === 0) {
      return;
    }

    const rawValue =
      barcodes[0].rawValue;

    if (rawValue !== 'ingreso-local') {
      await this._showError(
        'Ese código QR no corresponde al ingreso del local.'
      );

      return;
    }

    // console.log("guest.page.ts 178")
    // console.log("ESCANEO CORRECTO")
    
    this.scanning.set(true);

    try {
      const {
        file,
        fullName,
        comensales,
        consideraciones,
      } = this.form.getRawValue();

      if (!file || !fullName) {
        await this._showError(
          'Completá todos los datos antes de continuar.'
        );

        return;
      }

      /*
      * 1. Crear / iniciar sesión como invitado
      */
      const usuarioId =
        await this._authService.loginAnonymous(
          fullName,
          file
        );

      console.log("guest.page.ts 208")
      console.log(usuarioId)

      /*
       * 2. Agregar el cliente a la lista de espera
       */
      const entry =
        await this._waitlistService.add({
          usuario_id: usuarioId,
          estado: 'esperando',
          comensales: comensales ?? 1,
          consideraciones:
            consideraciones ?? [],
        });

      console.log("guest.page.ts 223")
      console.log(entry)

      /*
       * 3. Avisar al metre
       */
      try {
        await this._waitlistService.notifyNewWaitlist(
          entry.id
        );
      } catch (error) {
        console.warn(
          'No se pudo notificar al metre:',
          error
        );
      }

      /*
       * 4. Llevar al invitado a la sala de espera
       */
      await this._router.navigate([
        '/waiting-room',
      ]);
    } catch (error) {
      console.error(
        'Error creando invitado:',
        error
      );

      await this._showError(
        'No pudimos anotarte en la lista. Probá de nuevo.'
      );
    } finally {
      this.scanning.set(false);
    }
  }

  private async _showError(
    mensaje: string
  ): Promise<void> {
    const toast =
      await this._toastController.create({
        message: mensaje,
        duration: 3000,
        position: 'top',
        color: 'danger',
      });

    await toast.present();
  }
}