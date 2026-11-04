import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { Auth, DatosRedSocial } from '@app/services/auth/auth';
import { Storage } from '@app/services/storage';
import { Vibracion } from '@app/services/vibracion/vibracion';
import { SupabaseService } from '@app/services/supabase.service';
import { passwordMatchValidator } from '@app/validators';
import { PersonalStepPage } from '../register/steps/personal-step/personal-step.page';
import { CredentialsStepPage } from '../register/steps/credentials-step/credentials-step.page';
import { ProfileStepPage } from '../register/steps/profile-step/profile-step.page';
import { ProgressBarComponent } from '@app/components';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';

const NAME_PATTERN =
  /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;
const DNI_PATTERN = /^\d{8}$/;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,64}$/;

const NOMBRE_RED: Record<string, string> = {
  google: 'Google',
  discord: 'Discord',
};

// "Completá tu registro": cliente nuevo que entró con Google o Discord
@Component({
  selector: 'app-registro-social',
  templateUrl: './registro-social.page.html',
  styleUrls: ['./registro-social.page.scss'],
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonTitle,
    IonContent,
    IonFooter,
    IonButton,
    PersonalStepPage,
    CredentialsStepPage,
    ProfileStepPage,
    ProgressBarComponent,
    ConfirmVolverComponent,
    SpinnerLogoComponent,
  ],
})
export class RegistroSocialPage implements OnInit {
  private readonly auth = inject(Auth);
  private readonly storage = inject(Storage);
  private readonly supabaseService = inject(SupabaseService);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);
  private readonly vibracion = inject(Vibracion);

  personal = new FormGroup({
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
  });

  // el correo viene de la red y no se cambia; la contraseña permite
  // ingresar también con correo, igual que el registro normal
  credenciales = new FormGroup(
    {
      email: new FormControl({ value: '', disabled: true }),
      password: new FormControl('', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(PASSWORD_PATTERN),
      ]),
      confirmPassword: new FormControl('', [Validators.required]),
    },
    { validators: passwordMatchValidator }
  );

  // foto propia opcional (reemplaza la de la red)
  perfil = new FormGroup({
    file: new FormControl<File | null>(null),
  });

  // mismos 3 pasos que el registro normal
  pasoActual = signal<number>(1);

  datos = signal<DatosRedSocial | null>(null);
  cambiarFoto = signal<boolean>(false);
  guardando = signal<boolean>(false);

  async ngOnInit(): Promise<void> {
    const usuario = await this.auth.obtenerUsuarioActual();

    // ya tiene perfil: no corresponde completar el registro
    if (!usuario || this.auth.obtenerPerfil(usuario)) {
      await this.router.navigate(['/login'], { replaceUrl: true });

      return;
    }

    const datos = this.auth.datosRedSocial(usuario);

    this.datos.set(datos);
    this.cambiarFoto.set(!datos.avatar);

    this.personal.patchValue({
      name: datos.nombre,
      lastName: datos.apellido,
    });

    this.credenciales.patchValue({ email: datos.email });
  }

  nombreRed(): string {
    return NOMBRE_RED[this.datos()?.red ?? ''] ?? 'la red social';
  }

  tituloPaso(): string {
    switch (this.pasoActual()) {
      case 1:
        return 'Datos personales';

      case 2:
        return 'Acceso';

      default:
        return 'Perfil';
    }
  }

  siguientePaso(): void {
    const formulario = this.pasoActual() === 1 ? this.personal : this.credenciales;

    if (formulario.invalid) {
      formulario.markAllAsTouched();
      void this.vibracion.errorValidacion();

      return;
    }

    this.pasoActual.update((paso) => paso + 1);
  }

  pasoAnterior(): void {
    this.pasoActual.update((paso) => Math.max(1, paso - 1));
  }

  async finalizar(): Promise<void> {
    if (this.guardando()) {
      return;
    }

    const archivo = this.perfil.value.file ?? null;
    const sinFoto = !archivo && !this.datos()?.avatar;

    if (this.personal.invalid || this.credenciales.invalid || sinFoto) {
      this.personal.markAllAsTouched();
      this.credenciales.markAllAsTouched();
      void this.vibracion.errorValidacion();

      await this.mostrarToast(
        sinFoto
          ? 'Sumá tu foto para completar el registro.'
          : 'Revisá los datos ingresados antes de continuar.'
      );

      return;
    }

    this.guardando.set(true);

    try {
      // primero la contraseña: si falla, todavía no se creó nada
      await this.auth.establecerContrasena(
        this.credenciales.getRawValue().password ?? ''
      );

      const avatar = archivo
        ? await this.storage.uploadImage(archivo)
        : await this.copiarFotoDeRed(this.datos()?.avatar ?? null);

      const { name, lastName, dni } = this.personal.getRawValue();

      await this.auth.completarRegistroSocial({
        nombre: (name ?? '').trim(),
        apellido: (lastName ?? '').trim(),
        documento: dni ?? '',
        avatar,
      });

      await this.mostrarToast(
        '¡Tu cuenta fue creada! Quedó pendiente de aprobación: te avisamos por correo.'
      );

      await this.router.navigate(['/login'], { replaceUrl: true });
    } catch (error) {
      console.error('Error al completar el registro social:', error);
      await this.vibracion.error();
      await this.mostrarToast(
        'No pudimos completar el registro. Intentá nuevamente más tarde.'
      );
    } finally {
      this.guardando.set(false);
    }
  }

  // guarda una copia propia: si la persona cambia su foto en la red, el enlace viejo se rompe
  private async copiarFotoDeRed(url: string | null): Promise<string | null> {
    if (!url) {
      return null;
    }

    // Google manda la foto en 96px: pedimos una más grande
    const urlGrande = url.replace(/=s\d+-c$/, '=s400-c');

    try {
      return await this.storage.subirImagenDesdeUrl(urlGrande);
    } catch (error) {
      console.error('No se pudo copiar la foto de la red, se usa el enlace:', error);

      return url;
    }
  }

  // sale sin registrarse: no deja la sesión de la red abierta
  async cancelar(): Promise<void> {
    await this.supabaseService.client.auth.signOut();
    this.auth.usuarioActual.set(null);
    await this.router.navigate(['/login'], { replaceUrl: true });
  }

  private async mostrarToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 5000,
      position: 'top',
    });

    await toast.present();
  }
}
