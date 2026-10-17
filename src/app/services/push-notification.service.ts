
import { Injectable, inject } from '@angular/core';
import {
  ActionPerformed,
  PushNotificationSchema,
  PushNotifications,
  Token,
} from '@capacitor/push-notifications';
import { Platform, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';

import { SupabaseService } from './supabase.service';
import { Vibracion } from './vibracion/vibracion';

const RUTA_POR_TIPO: Record<string, string> = {
  consulta_mozo: '/admin/queries',
  respuesta_mozo: '/chat',
  lista_espera: '/admin/waitlist',
  mesa_asignada: '/waiting-room',
  cliente_pendiente: '/admin/clients',
};

@Injectable({
  providedIn: 'root',
})
export class PushNotificationService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly platform = inject(Platform);
  private readonly toastController = inject(ToastController);
  private readonly router = inject(Router);
  private readonly vibracion = inject(Vibracion);

  private listenersConfigurados = false;

  async inicializar(): Promise<void> {
    if (!this.platform.is('android')) {
      return;
    }

    const { data, error } =
      await this.supabaseService.client.auth.getUser();

    if (error || !data.user) {
      console.warn(
        'No se pueden registrar las push: no hay usuario autenticado.'
      );
      return;
    }

    if (!this.listenersConfigurados) {
      await this.configurarListeners();
      this.listenersConfigurados = true;
    }

    const permiso = await PushNotifications.checkPermissions();

    if (permiso.receive !== 'granted') {
      const resultado = await PushNotifications.requestPermissions();

      if (resultado.receive !== 'granted') {
        console.warn(
          'El usuario no otorgó permisos para notificaciones.'
        );
        return;
      }
    }

    // Solicitar el registro en cada inicio de sesión.
    await PushNotifications.register();

    console.log(
      'Registro de push solicitado para el usuario:',
      data.user.id
    );
  }

  private async configurarListeners(): Promise<void> {
    await PushNotifications.addListener(
      'registration',
      async (token: Token) => {
        console.log('TOKEN FCM:', token.value);
        await this.guardarToken(token.value);
      }
    );

    await PushNotifications.addListener(
      'registrationError',
      (error) => {
        void this.vibracion.error();
        console.error('Error registrando Push Notifications:', error);
      }
    );

    await PushNotifications.addListener(
      'pushNotificationReceived',
      async (notification: PushNotificationSchema) => {
        await this.mostrarAviso(notification);
      }
    );

    await PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        this.irALaPantalla(action.notification.data);
      }
    );
  }

  private async mostrarAviso(
    notification: PushNotificationSchema
  ): Promise<void> {
    const toast = await this.toastController.create({
      header: notification.title,
      message: notification.body,
      duration: 5000,
      position: 'top',
      color: 'primary',
      buttons: [
        {
          text: 'Ver',
          handler: () => this.irALaPantalla(notification.data),
        },
      ],
    });

    await toast.present();
  }

  private irALaPantalla(
    datos: Record<string, unknown> | undefined
  ): void {
    const tipo =
      typeof datos?.['tipo'] === 'string'
        ? (datos['tipo'] as string)
        : null;

    const ruta = tipo ? RUTA_POR_TIPO[tipo] : undefined;

    if (ruta) {
      void this.router.navigate([ruta]);
    }
  }

  private async guardarToken(token: string): Promise<void> {
    const { data, error: authError } =
      await this.supabaseService.client.auth.getUser();

    if (authError || !data.user) {
      console.warn(
        'No hay un usuario autenticado para guardar el token.'
      );
      return;
    }

    const { error } = await this.supabaseService.client.rpc(
      'registrar_dispositivo_push',
      {
        p_token: token,
        p_plataforma: 'android',
      }
    );

    if (error) {
      void this.vibracion.error();

      console.error(
        'Error guardando token FCM:',
        JSON.stringify(error, null, 2)
      );
      return;
    }

    console.log(
      'TOKEN FCM GUARDADO CORRECTAMENTE para:',
      data.user.id
    );
  }

async desvincularDispositivo(): Promise<void> {
  if (!this.platform.is('android')) {
    return;
  }

  // 1. Desactivar en la base. Tiene que ir ANTES del signOut (usa auth.uid()).
  const { error } = await this.supabaseService.client.rpc(
    'desvincular_dispositivos_push'
  );

  if (error) {
    console.error('Error desvinculando el dispositivo de las push:', error);
  }

  // 2. Borrar el token FCM del teléfono y soltar los listeners.
  try {
    await PushNotifications.unregister();
    await PushNotifications.removeAllListeners();
  } finally {
    this.listenersConfigurados = false;
  }
}
}
