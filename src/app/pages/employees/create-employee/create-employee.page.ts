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
  IonSpinner,
  IonFooter,
  ToastController,
  IonModal,
  IonRouterOutlet,
  NavController,
} from '@ionic/angular';
import { Router } from '@angular/router';
import { PersonalStepPage } from './steps/personal-step/personal-step.page';
import { CredentialsStepPage } from './steps/credentials-step/credentials-step.page';
import { ProfileStepPage } from './steps/profile-step/profile-step.page';
import { Auth, Storage, User } from '@app/services';
import { EPerfilUsuario } from '@app/enums';
import { ProgressBarComponent } from '@app/components';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { ConfirmDialogComponent } from '@app/components/ui/confirm-cartel/confirm-cartel.component';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { Vibracion } from '@app/services';
import { cuilDniMatchValidator, employeeRoleValidator, passwordMatchValidator } from '@app/validators';
import { cuilValidator } from '@app/validators/cuil-validator';

const NAME_PATTERN =
  /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;
const DNI_PATTERN = /^\d{8}$/;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,64}$/;

@Component({
  selector: 'app-create-employee',
  templateUrl: './create-employee.page.html',
  styleUrls: ['./create-employee.page.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonButtons,
    IonSpinner,
    IonFooter,
    IonModal,
    PersonalStepPage,
    CredentialsStepPage,
    ProfileStepPage,
    ProgressBarComponent,
    ConfirmVolverComponent,
    ConfirmDialogComponent,
    SpinnerLogoComponent,
  ],
})
export class CreateEmployeePage {
  private _userRepository = inject(User);
  private _storageService = inject(Storage);
  private _router = inject(Router);
  private _routerOutlet = inject(IonRouterOutlet, { optional: true });
  private _navCtrl = inject(NavController);

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
      
      cuil: new FormControl('', [Validators.required]),

      dni: new FormControl('', [
        Validators.required,
        Validators.pattern(DNI_PATTERN),
      ]),

      role: new FormControl<any | null>(null, Validators.required),
    }, { validators: cuilDniMatchValidator }),



    credentials: new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),

      password: new FormControl('', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(PASSWORD_PATTERN),
      ]),


      confirmPassword: new FormControl('', [Validators.required]),
    }, { validators: passwordMatchValidator }),

    profile: new FormGroup({
      file: new FormControl<File | null>(null, Validators.required),
    }),
  });

  currentStep = signal<number>(1);
  isLoading = signal<boolean>(false);
  mostrarRegistroExitoso = signal<boolean>(false);
  private readonly authService = inject(Auth);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);
  private _vibracion = inject(Vibracion);

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

  async onBack() {
    if (this._routerOutlet?.canGoBack()) {
      this._navCtrl.back();
    } else {
      await this._navCtrl.navigateBack("/");
    }
  }

  async register(): Promise<void> {
    if (this.isLoading()) {
      return;
    }

    try {
      const data = this.form.getRawValue() as any;

      this.isLoading.set(true);

      this.form.markAsPending();
      
      const user = await this.authService.registerEmployee(
        data,
        data.personal.role
      ) as any;

      await this._userRepository.update(user.user?.id, {
        cuil: data.personal.cuil,
      })

      await this._navCtrl.navigateRoot('/admin/employees', {
        animated: true,
        animationDirection: 'back',
        replaceUrl: true,
      });
    } catch (error) {
      await this._vibracion.error();
      console.error('Error durante el registro:', error);

      const toast = await this.toastController.create({
        message:
          'No pudimos completar el registro. Intentá nuevamente más tarde.',
        duration: 5000,
        position: 'top',
      });

      await toast.present();
    } finally {
      this.isLoading.set(false);
    }
  }

  cancelarRegistro(): void {
    void this.router.navigateByUrl('/admin/employees', {
      replaceUrl: true,
    });
  }

  cerrarRegistroExitoso(): void {
    this.mostrarRegistroExitoso.set(false);

    void this.router.navigateByUrl('/login', {
      replaceUrl: true,
    });
  }
}