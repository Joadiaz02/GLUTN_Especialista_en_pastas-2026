import {
  Component,
  inject,
  signal,
  ChangeDetectorRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router,RouterLink} from '@angular/router';
import {
  IonText,
  ToastController,
  IonItem,
  IonInput,
  IonContent,
  IonButton,
  IonSpinner,
} from '@ionic/angular';
import { Vibracion } from '@app/services/vibracion';
import { Auth } from '../../services/auth/auth';
import {PushNotificationService} from '../../services/push-notification.service';
import {SupabaseService} from '../../services/supabase.service';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';

@Component({
  selector:'app-login',
  standalone: true,
  templateUrl:'./login.page.html',
  styleUrl: './login.page.scss',
  imports: [
    FormsModule,
    RouterLink,
    IonText,
    IonItem,
    IonInput,
    IonContent,
    IonButton,
    IonSpinner,
    SpinnerLogoComponent
  ],
})
export class LoginPage {

  private readonly router = inject(Router);
  private readonly authService = inject(Auth);
  private readonly vibracion = inject(Vibracion);
  private readonly toastController = inject(ToastController);
  private readonly pushNotificationService = inject(PushNotificationService);
  private readonly supabaseService = inject(SupabaseService);
  private readonly cdr = inject(ChangeDetectorRef);
  email = '';

  contrasena = '';

  logo ='assets/images/LOGO-GLUTN.png';

  credencialesinvalidas = signal<boolean | null>(null);

  cargando = signal<boolean>(false);

  
ionViewWillEnter(): void {
const navigationState =
  this.router.currentNavigation()?.extras.state
  ?? history.state;

  const credenciales =
    navigationState?.['credencialesAccesoRapido'];

  if (credenciales?.email && credenciales?.password) {
    this.email = credenciales.email;
    this.contrasena = credenciales.password;

    // Actualizar el formulario inmediatamente,
    // sin esperar a que el usuario toque un campo.
    this.cdr.detectChanges();

    // Limpiar las credenciales del historial después
    // de haberlas recibido.
    const estadoActual = { ...history.state };
    delete estadoActual['credencialesAccesoRapido'];

    history.replaceState(
      estadoActual,
      '',
      window.location.href
    );
  }
}

  
  get formularioValido(): boolean {
    const emailValido =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(this.email);

    const contrasenaValida =
      this.contrasena.length > 0;

    return (
      emailValido &&
      contrasenaValida
    );
  }

async iniciarSesion(): Promise<void> {
  if (this.cargando()) {
    return;
  }

  const email = this.email.trim();
  const password = this.contrasena;

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length === 0
  ) {
    await this.vibracion.errorValidacion();
    return;
  }

  this.cargando.set(true);
  this.credencialesinvalidas.set(null);

  try {
    // 1. AUTENTICACIÓN
    let usuario: any;

    try {
      usuario = await this.authService.iniciarsecion({
        email,
        password,
      });
    } catch (error) {
      const mensaje =
        error instanceof Error ? error.message : '';

      console.error('Error de autenticación:', error);

      if (mensaje === 'CUENTA_PENDIENTE') {
        await this.mostrarToast(
          'Tu cuenta está pendiente de aprobación. Te avisaremos cuando puedas ingresar.'
        );
        await this.vibracion.error();
        return;
      }

      if (mensaje === 'CUENTA_RECHAZADA') {
        await this.mostrarToast(
          'Tu cuenta fue rechazada. Revisá el correo enviado para conocer el motivo.'
        );
        await this.vibracion.error();
        return;
      }

      this.credencialesinvalidas.set(true);

      await this.mostrarToast(
        'No se pudo iniciar sesión. Verificá tus credenciales e intentá nuevamente.'
      );

      await this.vibracion.error();
      return;
    }

    this.credencialesinvalidas.set(false);

    // 2. NOTIFICACIONES PUSH
    // Un error de Push no debe presentarse como un error de contraseña.
    try {
      await this.pushNotificationService.inicializar();

      if (this.authService.esPersonal(usuario)) {
        await this.probarPush(usuario.id);
      }
    } catch (error) {
      console.error(
        'La autenticación fue correcta, pero falló la inicialización de Push:',
        error
      );
    }

    // 3. REDIRECCIÓN SEGÚN EL PERFIL
    if (this.authService.esPersonal(usuario)) {
      await this.router.navigate(['/admin'], {
        replaceUrl: true,
      });
    } else {
      await this.router.navigate(['/home'], {
        replaceUrl: true,
      });
    }
  } catch (error) {
    // Los errores posteriores a la autenticación se registran
    // por separado y no se etiquetan como credenciales incorrectas.
    console.error(
      'Error posterior a la autenticación:',
      error
    );

    await this.mostrarToast(
      'La sesión se inició, pero ocurrió un problema al continuar. Revisá la consola.'
    );
  } finally {
    this.cargando.set(false);
  }
}

  private async mostrarToast(
    message: string
  ): Promise<void> {

    const toast =
      await this.toastController
        .create({
          message,
          duration: 5000,
          position: 'top',
        });

    await toast.present();
  }

  private async probarPush(
    usuarioId: string
  ): Promise<void> {

    const {
      data,
      error,
    } =
      await this.supabaseService.client
        .functions
        .invoke(
          'send-push',
          {
            body: {
              usuarioIds: [
                usuarioId,
              ],

              titulo: 'GLUTN',

              cuerpo:
                '¡Las notificaciones Push están funcionando!',
            },
          }
        );

    console.log(
      'RESULTADO PUSH:',
      data
    );

    if (error) {
      console.error(
        'ERROR PUSH:',
        error
      );
    }
  }
}