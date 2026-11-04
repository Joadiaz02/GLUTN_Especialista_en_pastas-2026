import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Vibracion } from '../../services/vibracion/vibracion';
import {
  IonContent,
  IonIcon,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, personCircleOutline} from 'ionicons/icons';
import { Auth } from '../../services/auth/auth';
import { SupabaseService } from '../../services/supabase.service';
import { PushNotificationService } from '../../services/push-notification.service';
import { EPerfilUsuario } from '../../enums/role.enum';
import type { PerfilUsuario } from '../../models/usuario.model';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';

interface UsuarioAccesoRapido {
  nombre: string;
  rol: string;
  perfil: PerfilUsuario;
  email: string;
  password: string;
  foto: string;
}

@Component({
  selector: 'app-quick-access',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonIcon,
    SpinnerLogoComponent
  ],
  templateUrl: './quick-access.page.html',
  styleUrl: './quick-access.page.scss',
})
export class QuickAccessPage {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);
  private readonly supabaseService = inject(SupabaseService);
  private readonly pushNotificationService = inject(PushNotificationService);
  private readonly vibracion = inject(Vibracion);
  usuarioIngresando: string | null = null;
  readonly usuarios: UsuarioAccesoRapido[] = [

    {
      nombre: 'Roberto García',
      rol: 'Dueño',
      perfil: EPerfilUsuario.Dueno,
      email: 'roberto.garcia@glutn.com',
      password: 'Glutn2026',
      foto: this.obtenerFoto(
        'roberto-garcia.jpg'
      ),
    },

    {
      nombre: 'Marcela Fernández',
      rol: 'Supervisor',
      perfil: EPerfilUsuario.Supervisor,
      email: 'marcela.fernandez@glutn.com',
      password: 'Glutn2026',
      foto: this.obtenerFoto(
        'marcela-fernandez.jpg'
      ),
    },

    {
      nombre: 'Nicolás Rodríguez',
      rol: 'Metre',
      perfil: EPerfilUsuario.Metre,
      email: 'nicolas.rodriguez@glutn.com',
      password: 'Glutn2026',
      foto: this.obtenerFoto(
        'nicolas-rodriguez.jpg'
      ),
    },

    {
      nombre: 'Lucas Martínez',
      rol: 'Mozo',
      perfil: EPerfilUsuario.Mozo,
      email: 'lucas.martinez@glutn.com',
      password: 'Glutn2026',
      foto: this.obtenerFoto(
        'lucas-martinez.jpg'
      ),
    },

    {
      nombre: 'Federico Sosa',
      rol: 'Cocinero',
      perfil: EPerfilUsuario.Cocinero,
      email: 'federico.sosa@glutn.com',
      password: 'Glutn2026',
      foto: this.obtenerFoto(
        'federico-sosa.jpg'
      ),
    },

    {
      nombre: 'Andrea Torres',
      rol: 'Cantinero',
      perfil: EPerfilUsuario.Cantinero,
      email: 'andrea.torres@glutn.com',
      password: 'Glutn2026',
      foto: this.obtenerFoto(
        'andrea-torres.jpg'
      ),
    },

    {
      nombre: 'Lucas Castro',
      rol: 'Cliente registrado',
      perfil: EPerfilUsuario.ClienteRegistrado,
      email: 'lucas.castro@glutn.com',
      password: 'Glutn2026',
      foto: this.obtenerFoto(
        'lucas-castro.jpg'
      ),
    }

  ];

  constructor() {

    addIcons({
      arrowBackOutline,
      personCircleOutline
    });

  }

  private obtenerFoto(
    nombreArchivo: string
  ): string {

    return this.supabaseService
      .getAvatarUrl(
        `usuarios/${nombreArchivo}`
      )
      .data
      .publicUrl;

  }

  volver(): void {

    void this.router.navigate([
      '/login'
    ]);

  }

  


async ingresar(
  usuario: UsuarioAccesoRapido
): Promise<void> {
  if (this.usuarioIngresando !== null) {
    return;
  }

  this.usuarioIngresando = usuario.email;

  try {
    // Mostrar el spinner antes de iniciar la navegación.
    await new Promise<void>(resolve => {
      setTimeout(resolve, 100);
    });

    const navegacionExitosa = await this.router.navigate(
      ['/login'],
      {
        state: {
          credencialesAccesoRapido: {
            email: usuario.email,
            password: usuario.password,
          },
        },
        replaceUrl: true,
      }
    );

    if (!navegacionExitosa) {
      this.usuarioIngresando = null;

      await this.mostrarError(
        'No se pudo abrir el inicio de sesión.'
      );
    }
  } catch (error) {
    console.error('Error al abrir el login:', error);

    this.usuarioIngresando = null;

    await this.mostrarError(
      'No se pudo abrir el inicio de sesión.'
    );

    await this.vibracion.error();
  }
}




  private async mostrarError(
    message: string
  ): Promise<void> {

    const toast =
      await this.toastController
        .create({

          message,

          duration: 4000,

          position: 'top'

        });

    await toast.present();

  }

}