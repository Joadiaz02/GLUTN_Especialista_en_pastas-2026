import { Injectable, inject } from '@angular/core';
import {
  ActionPerformed,
  PushNotificationSchema,
  PushNotifications,
  Token,
} from '@capacitor/push-notifications';
import { Platform } from '@ionic/angular';

import { SupabaseService } from './supabase.service';
import { Auth } from './auth/auth';

@Injectable({
  providedIn: 'root',
})
export class PushNotificationService {
  private readonly supabaseService =
    inject(SupabaseService);

  private readonly authService =
    inject(Auth);

  private readonly platform =
    inject(Platform);

  private inicializado = false;

  async inicializar(): Promise<void> {
    if (!this.platform.is('android')) {
      return;
    }

    if (this.inicializado) {
      return;
    }

    const usuario =
      await this.authService.obtenerUsuarioActual();

    if (!usuario?.id) {
      return;
    }

    this.inicializado = true;

    await this.configurarListeners();

    const permiso =
      await PushNotifications.checkPermissions();

    if (permiso.receive !== 'granted') {
      const resultado =
        await PushNotifications.requestPermissions();

      if (resultado.receive !== 'granted') {
        console.warn(
          'El usuario no otorgó permisos para notificaciones.'
        );

        return;
      }
    }

    await PushNotifications.register();
  }

  private async configurarListeners(): Promise<void> {
    await PushNotifications.addListener(
      'registration',
      async (token: Token) => {
        console.log(
          'TOKEN FCM:',
          token.value
        );

        await this.guardarToken(
          token.value
        );
      }
    );

    await PushNotifications.addListener(
      'registrationError',
      (error) => {
        console.error(
          'Error registrando Push Notifications:',
          error
        );
      }
    );

    await PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log(
          'NOTIFICACIÓN RECIBIDA:',
          notification
        );
      }
    );

    await PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        console.log(
          'ACCIÓN SOBRE NOTIFICACIÓN:',
          action
        );
      }
    );
  }

  private async guardarToken(
  token: string
): Promise<void> {
  const usuario =
    await this.authService.obtenerUsuarioActual();

  if (!usuario?.id) {
    console.warn(
      'No hay un usuario autenticado para guardar el token.'
    );

    return;
  }

  const { error } =
    await this.supabaseService.client
      .rpc(
        'registrar_dispositivo_push',
        {
          p_token: token,
          p_plataforma: 'android',
        }
      );

  if (error) {
    console.error(
      'Error guardando token FCM:',
      JSON.stringify(
        error,
        null,
        2
      )
    );

    return;
  }

  console.log(
    'TOKEN FCM GUARDADO CORRECTAMENTE'
  );
}
}