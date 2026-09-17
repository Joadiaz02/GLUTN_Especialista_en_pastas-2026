import {
  Component,
  inject,
  signal,
} from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import {
  FormsModule,
} from '@angular/forms';

import {
  Router,
  RouterLink,
} from '@angular/router';

import {
  ToastController,
} from '@ionic/angular';

import {
  Haptics,
} from '@capacitor/haptics';

import { Auth } from '../../services/auth/auth';
import {
  PushNotificationService,
} from '../../services/push-notification.service';

@Component({
  selector: 'app-login',
  imports: [
    FormsModule,
    RouterLink,
  ],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  email = '';

  contrasena = '';

  logo ='assets/images/LOGO-GLUTN.png';

  credencialesinvalidas =signal<boolean | null>(null);

  cargando =signal<boolean>(false);

  private readonly toastController =inject(ToastController);

  private readonly pushNotificationService =inject(PushNotificationService);

  private readonly supabaseService = inject(SupabaseService);
  constructor(
    private readonly router: Router,
    private readonly authService: Auth
  ) {}

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
    if (
      !this.formularioValido
    ) {
      return;
    }

    this.cargando.set(true);

    this.credencialesinvalidas.set(
      null
    );

    try {
      const usuario =
        await this.authService
          .iniciarsecion({
            email:
              this.email,

            password:
              this.contrasena,
          });

      this.credencialesinvalidas.set(
        false
      );

      await this.pushNotificationService
        .inicializar();
      if (
      this.authService.esPersonal(usuario)
      ) {
       await this.probarPush(usuario.id);
      }
      if (
        this.authService
          .esPersonal(usuario)
      ) {
        await this.router.navigate([
          '/seleccion-acceso',
        ]);

        return;
      }

      await this.router.navigate([
        '/home',
      ]);

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

        await this.vibrarError();

        return;
      }

      if (
        mensaje ===
        'CUENTA_RECHAZADA'
      ) {
        await this.mostrarToast(
          'Tu cuenta fue rechazada. Revisá el correo enviado para conocer el motivo.'
        );

        await this.vibrarError();

        return;
      }

      this.credencialesinvalidas.set(
        true
      );

      await this.mostrarToast(
        'Correo o contraseña incorrectos. Verificá tus datos e intentá nuevamente.'
      );

      await this.vibrarError();

      this.reproducirSonidoError();

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

  private async vibrarError(
    durationMs: number = 300
  ): Promise<void> {
    await Haptics.vibrate({
      duration:
        durationMs,
    });
  }

  private reproducirSonidoError(): void {
    const audio =
      new Audio(
        'assets/sounds/spongebob-fail.mp3'
      );

    audio.load();

    audio.play()
      .catch((error) => {
        console.warn(
          'El reproductor de audio requiere interacción previa del usuario:',
          error
        );
      });
  }

  private async probarPush(
  usuarioId: string
): Promise<void> {
  const { data, error } =
    await this.supabaseService.client
      .functions
      .invoke('send-push', {
        body: {
          usuarioIds: [usuarioId],
          titulo: 'GLUTN',
          cuerpo:
            '¡Las notificaciones Push están funcionando!',
        },
      });

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