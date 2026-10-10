import {
  Component,
  inject,
  signal,
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

  email = '';

  contrasena = '';

  logo ='assets/images/LOGO-GLUTN.png';

  credencialesinvalidas = signal<boolean | null>(null);

  cargando = signal<boolean>(false);

  
constructor() {
  const navigationState =
    this.router.getCurrentNavigation()?.extras.state
    ?? history.state;

  const credenciales = navigationState?.['credencialesAccesoRapido'];

  if (credenciales) {
    this.email = credenciales.email ?? '';
    this.contrasena = credenciales.password ?? '';
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

    if (!this.formularioValido) {
      await this.vibracion.errorValidacion();
      return;
    }

    this.cargando.set(true);

    this.credencialesinvalidas.set(null);

    try {

      const usuario =
        await this.authService
          .iniciarsecion({
            email: this.email,
            password: this.contrasena,
          });

      this.credencialesinvalidas.set(false);

      await this.pushNotificationService
        .inicializar();

      if (
        this.authService
          .esPersonal(usuario)
      ) {
        await this.probarPush(
          usuario.id
        );
      }

      if (
        this.authService
          .esPersonal(usuario)
      ) {
        await this.router.navigate(
        ['/admin'],
        { replaceUrl: true }
        );

        return;
      }

      await this.router.navigate(
        ['/home']
      );

    } catch (error) {

      const mensaje =
        error instanceof Error
          ? error.message
          : '';

      if (
        mensaje ===
        'CUENTA_PENDIENTE'
      ) {

        await this.mostrarToast(
          'Tu cuenta está pendiente de aprobación. Te avisaremos cuando puedas ingresar.'
        );

        await this.vibracion.error();

        return;
      }

      if (
        mensaje ===
        'CUENTA_RECHAZADA'
      ) {

        await this.mostrarToast(
          'Tu cuenta fue rechazada. Revisá el correo enviado para conocer el motivo.'
        );

        await this.vibracion.error();

        return;
      }

      this.credencialesinvalidas
        .set(true);

      await this.mostrarToast(
        'Correo o contraseña incorrectos. Verificá tus datos e intentá nuevamente.'
      );

      await this.vibracion.error();

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