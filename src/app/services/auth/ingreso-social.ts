import { inject, Injectable, NgZone, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Auth, ESQUEMA_RETORNO_SOCIAL, RedSocial } from './auth';
import { SupabaseService } from '../supabase.service';
import { PushNotificationService } from '../push-notification.service';
import { Vibracion } from '../vibracion/vibracion';

// sobrevive a la recarga de la página en web (la red vuelve a /login)
const CLAVE_VINCULACION = 'vinculacionSocial';

interface Vinculacion {
  red: RedSocial;
  volverA: string;
}

const NOMBRE_RED: Record<string, string> = {
  google: 'Google',
  discord: 'Discord',
};

// orquesta el ingreso y la vinculación con Google y Discord
@Injectable({
  providedIn: 'root',
})
export class IngresoSocial {
  private readonly auth = inject(Auth);
  private readonly supabaseService = inject(SupabaseService);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  private readonly toastController = inject(ToastController);
  private readonly vibracion = inject(Vibracion);
  private readonly pushNotificationService = inject(PushNotificationService);

  // true mientras se abre la red o se procesa la vuelta (muestra el spinner)
  readonly procesando = signal<boolean>(false);

  // avisa a "Mi cuenta" que cambió una vinculación
  readonly vinculacionesActualizadas = signal<number>(0);

  private retornoEnCurso = false;

  // se llama una sola vez, al arrancar la app
  escucharRetorno(): void {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    App.addListener('appUrlOpen', ({ url }) => {
      if (url.startsWith(ESQUEMA_RETORNO_SOCIAL)) {
        // los eventos de Capacitor llegan fuera de Angular
        this.zone.run(() => this.procesarRetorno(url));
      }
    });

    // si la app estaba cerrada, la vuelta llega como URL de arranque
    App.getLaunchUrl().then((arranque) => {
      if (arranque?.url?.startsWith(ESQUEMA_RETORNO_SOCIAL)) {
        this.zone.run(() => this.procesarRetorno(arranque.url));
      }
    });

    // la persona cerró la pestaña del navegador sin terminar
    Browser.addListener('browserFinished', () => {
      this.zone.run(() => {
        if (!this.retornoEnCurso) {
          this.procesando.set(false);
        }
      });
    });
  }

  // botones del login
  async ingresar(red: RedSocial): Promise<void> {
    if (this.procesando()) {
      return;
    }

    sessionStorage.removeItem(CLAVE_VINCULACION);
    this.procesando.set(true);

    try {
      await this.auth.iniciarConRed(red);
    } catch (error) {
      console.error('No se pudo abrir el ingreso social:', error);
      this.procesando.set(false);
      await this.mostrarToast('No se pudo abrir el ingreso. Intentá nuevamente.');
      await this.vibracion.error();
    }
  }

  // botones de "Mi cuenta"
  async vincular(red: RedSocial): Promise<void> {
    if (this.procesando()) {
      return;
    }

    const vinculacion: Vinculacion = { red, volverA: this.router.url };

    sessionStorage.setItem(CLAVE_VINCULACION, JSON.stringify(vinculacion));
    this.procesando.set(true);

    try {
      await this.auth.vincularRed(red);
    } catch (error) {
      console.error('No se pudo abrir la vinculación:', error);
      sessionStorage.removeItem(CLAVE_VINCULACION);
      this.procesando.set(false);
      await this.mostrarToast(
        'No se pudo vincular la cuenta. Verificá que la vinculación esté habilitada e intentá nuevamente.'
      );
      await this.vibracion.error();
    }
  }

  async procesarRetorno(url: string): Promise<void> {
    if (this.retornoEnCurso) {
      return;
    }

    this.retornoEnCurso = true;
    this.procesando.set(true);

    if (Capacitor.isNativePlatform()) {
      await Browser.close().catch(() => undefined);
    }

    const vinculacion = this.leerVinculacion();

    try {
      if (vinculacion) {
        await this.terminarVinculacion(url, vinculacion);
      } else {
        await this.terminarIngreso(url);
      }
    } finally {
      this.retornoEnCurso = false;
      this.procesando.set(false);
    }
  }

  private async terminarIngreso(url: string): Promise<void> {
    try {
      const usuario = await this.auth.completarIngresoSocial(url);

      // igual que el login con correo: un error de push no frena el ingreso
      try {
        await this.pushNotificationService.inicializar();
      } catch (error) {
        console.error(
          'Ingreso correcto, pero falló la inicialización de Push:',
          error
        );
      }

      await this.router.navigate(
        [this.auth.esPersonal(usuario) ? '/admin' : '/home'],
        { replaceUrl: true }
      );
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : '';

      // cuenta de red nueva: completa sus datos y queda pendiente
      if (mensaje === 'PERFIL_INCOMPLETO') {
        await this.router.navigate(['/registro/social'], { replaceUrl: true });

        return;
      }

      await this.mostrarError(error);
      await this.router.navigate(['/login'], { replaceUrl: true });
    }
  }

  private async terminarVinculacion(
    url: string,
    vinculacion: Vinculacion
  ): Promise<void> {
    sessionStorage.removeItem(CLAVE_VINCULACION);

    const parametros = new URL(url).searchParams;
    const nombreRed = NOMBRE_RED[vinculacion.red];

    try {
      const descripcionError = parametros.get('error_description') ?? '';

      if (parametros.get('error')) {
        const yaVinculada = /already|linked|exist/i.test(descripcionError);

        await this.mostrarToast(
          yaVinculada
            ? `Esa cuenta de ${nombreRed} ya está vinculada a otro usuario de GLUTN.`
            : 'Cancelaste la vinculación.'
        );

        if (yaVinculada) {
          await this.vibracion.error();
        }

        return;
      }

      const codigo = parametros.get('code');

      if (Capacitor.isNativePlatform() && codigo) {
        const { error } =
          await this.supabaseService.client.auth.exchangeCodeForSession(codigo);

        if (error) {
          throw error;
        }
      }

      await this.auth.obtenerUsuarioActual();

      await this.mostrarToast(
        `${nombreRed} vinculado. Ya podés ingresar con él.`
      );
    } catch (error) {
      console.error('Error al vincular la red social:', error);
      await this.vibracion.error();
      await this.mostrarToast(
        `No se pudo vincular ${nombreRed}. Intentá nuevamente.`
      );
    } finally {
      this.vinculacionesActualizadas.update((valor) => valor + 1);
      await this.router.navigateByUrl(vinculacion.volverA, { replaceUrl: true });
    }
  }

  private leerVinculacion(): Vinculacion | null {
    try {
      const guardado = sessionStorage.getItem(CLAVE_VINCULACION);

      return guardado ? (JSON.parse(guardado) as Vinculacion) : null;
    } catch {
      return null;
    }
  }

  private async mostrarError(error: unknown): Promise<void> {
    const mensaje = error instanceof Error ? error.message : '';

    console.error('Error en el ingreso social:', error);

    const mensajes: Record<string, string> = {
      INGRESO_SOCIAL_CANCELADO:
        'Cancelaste el ingreso. Podés intentar de nuevo o usar tu correo.',
      CUENTA_PENDIENTE:
        'Tu cuenta está pendiente de aprobación. Te avisaremos cuando puedas ingresar.',
      CUENTA_RECHAZADA:
        'Tu cuenta fue rechazada. Revisá el correo enviado para conocer el motivo.',
    };

    await this.mostrarToast(
      mensajes[mensaje] ?? 'No se pudo completar el ingreso. Intentá nuevamente.'
    );

    if (mensaje !== 'INGRESO_SOCIAL_CANCELADO') {
      await this.vibracion.error();
    }
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
