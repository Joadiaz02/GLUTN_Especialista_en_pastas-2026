import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
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
    fullName: new FormControl('', Validators.required),
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

  nextStep(): void {
    const step = this.currentStep();

    if (step < 3) {
      this.currentStep.update((current) => current + 1);
    }
  }

  async scanQR() {
    // const { camera } = await BarcodeScanner.requestPermissions();

    // if (camera !== 'granted' && camera !== 'limited') {
    //   await this._showError('Necesitamos permiso de cámara para escanear el código.');
    
    //   return;
    // }

    // const { barcodes } = await BarcodeScanner.scan();
    
    // if (barcodes.length === 0) return;

    // if (barcodes[0].rawValue !== 'ingreso-local') {
    
    //   await this._showError('Ese código QR no corresponde al ingreso del local.');
    
    //   return;
    // }

    // this.scanning.set(true);

    try {
      const { file, fullName } = this.form.getRawValue();

      console.log("CREAR EL USUARIO INVITADO")
      
      const usuarioId = await this._authService.loginAnonymous(fullName!, file!);
      
      console.log(usuarioId)

      await this._waitlistService.add({
        usuario_id: usuarioId,
        estado: "esperando"
      });
      
      this._router.navigate(['/waiting-room']);
    } catch {
      await this._showError('No pudimos anotarte en la lista. Probá de nuevo.');
    } finally {
      this.scanning.set(false);
    }
  }

  private async _showError(mensaje: string): Promise<void> {
    const toast = await this._toastController.create({
      message: mensaje, duration: 3000, position: 'top', color: 'danger',
    });
    await toast.present();
  }

  previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update((current) => current - 1);
    }
  }
}
