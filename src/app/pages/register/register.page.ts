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
  IonButton,
  IonButtons,
  IonBackButton,
  IonSpinner,
  IonFooter,
  ToastController,
  IonToast,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { PersonalStepPage } from './steps/personal-step/personal-step.page';
import { CredentialsStepPage } from './steps/credentials-step/credentials-step.page';
import { ProfileStepPage } from './steps/profile-step/profile-step.page';
import { ProgressBarComponent } from './progress-bar/progress-bar.component';
import { Router } from '@angular/router';
import { Auth } from '@app/services';
import { EPerfilUsuario } from '@app/enums';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonButtons,
    IonBackButton,
    PersonalStepPage,
    CredentialsStepPage,
    ProfileStepPage,
    ProgressBarComponent,
    IonBackButton,
    IonSpinner,
    IonFooter,
  ],
})
export class RegisterPage {
  form = new FormGroup({
    personal: new FormGroup({
      name: new FormControl('', Validators.required),
      lastName: new FormControl('', Validators.required),
      dni: new FormControl('', [Validators.required, Validators.minLength(8)]),
    }),
    credentials: new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', Validators.required),
    }),
    profile: new FormGroup({
      file: new FormControl(null, Validators.required),
    }),
  });

  currentStep = signal<number>(1);
  isLoading = signal<boolean>(false);

  private _authService = inject(Auth);
  private _router = inject(Router);
  private _toastController = inject(ToastController);

  constructor() {
    addIcons({ arrowBackOutline });
  }

  getFormGroup(step: string) {
    return this.form.get(step) as FormGroup;
  }

  getStepTitle(): string {
    switch (this.currentStep()) {
      case 1:
        return 'Datos personales';
      case 2:
        return 'Acceso';
      case 3:
        return 'Perfil';
      default:
        return '';
    }
  }

  nextStep(): void {
    const step = this.currentStep();

    if (step === 1 && this.getFormGroup('personal').invalid) {
      this.getFormGroup('personal').markAllAsTouched();
      return;
    }

    if (step === 2 && this.getFormGroup('credentials').invalid) {
      this.getFormGroup('credentials').markAllAsTouched();
      return;
    }

    if (step < 3) {
      this.currentStep.update((s) => s + 1);
    }
  }

  previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update((s) => s - 1);
    }
  }

  async register() {
    try {
      const credentials = this.form.getRawValue();

      this.isLoading.set(true);

      this.form.markAsPending();

      await this._authService.register(
        credentials,
        EPerfilUsuario.ClienteRegistrado
      );

      this._router.navigateByUrl('/login', { replaceUrl: true });
    } catch (error) {
      const toast = await this._toastController.create({
        message:
          'No pudimos completar la acción. Intentá nuevamente más tarde.',
        duration: 5000,
        position: 'top',
      });

      await toast.present();
    } finally {
      this.isLoading.set(false);
    }
  }
}
