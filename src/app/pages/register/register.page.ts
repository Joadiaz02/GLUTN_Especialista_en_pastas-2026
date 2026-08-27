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
} from '@ionic/angular';

import { PersonalStepPage } from './steps/personal-step/personal-step.page';
import { CredentialsStepPage } from './steps/credentials-step/credentials-step.page';
import { ProfileStepPage } from './steps/profile-step/profile-step.page';
import { ProgressBarComponent } from './progress-bar/progress-bar.component';

import { Auth } from '../../services/auth/auth';
import { EPerfilUsuario } from '../../enums/role.enum';
import { Router } from '@angular/router';

const NAME_PATTERN =
  /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;

const DNI_PATTERN = /^\d{7,8}$/;

const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,64}$/;

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
  ],
})
export class RegisterPage {
  form = new FormGroup({
    personal: new FormGroup({
      name: new FormControl('', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50),
        Validators.pattern(NAME_PATTERN),
      ]),

      lastName: new FormControl('', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50),
        Validators.pattern(NAME_PATTERN),
      ]),

      dni: new FormControl('', [
        Validators.required,
        Validators.pattern(DNI_PATTERN),
      ]),
    }),

    credentials: new FormGroup({
      email: new FormControl('', [
        Validators.required,
        Validators.email,
      ]),

      password: new FormControl('', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(PASSWORD_PATTERN),
      ]),
    }),

    profile: new FormGroup({
      file: new FormControl<File | null>(
        null,
        Validators.required,
      ),
    }),
  });

  currentStep = signal<number>(1);

  private _authService = inject(Auth);
  private _router = inject(Router);

  getFormGroup(step: string): FormGroup {
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

    if (step === 1) {
      const personalForm = this.getFormGroup('personal');

      if (personalForm.invalid) {
        personalForm.markAllAsTouched();
        return;
      }
    }

    if (step === 2) {
      const credentialsForm = this.getFormGroup('credentials');

      if (credentialsForm.invalid) {
        credentialsForm.markAllAsTouched();
        return;
      }
    }

    if (step < 3) {
      this.currentStep.update((current) => current + 1);
    }
  }

  previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update((current) => current - 1);
    }
  }

  async register(): Promise<void> {
  const profileForm = this.getFormGroup('profile');

  if (profileForm.invalid) {
    profileForm.markAllAsTouched();
    return;
  }

  if (this.form.invalid) {
    this.form.markAllAsTouched();
    return;
  }

  try {
    const credentials = this.form.getRawValue();

    await this._authService.register(
      credentials,
      EPerfilUsuario.ClienteRegistrado,
    );

    await this._router.navigateByUrl('/login', {
      replaceUrl: true,
    });
  } catch (error) {
    console.error('Error al registrar el usuario:', error);
  }
}
}