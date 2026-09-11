import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Haptics } from '@capacitor/haptics';
import { IonContent, IonIcon, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  personCircleOutline
} from 'ionicons/icons';

import { Auth } from '../../services/auth/auth';
import { SupabaseService } from '../../services/supabase.service';
import { EPerfilUsuario } from '../../enums/role.enum';
import type { PerfilUsuario } from '../../models/usuario.model';

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
    IonIcon
  ],
  templateUrl: './quick-access.page.html',
  styleUrl: './quick-access.page.scss',
})
export class QuickAccessPage {

  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);
  private readonly supabaseService = inject(SupabaseService);

  usuarioIngresando: string | null = null;

  readonly usuarios: UsuarioAccesoRapido[] = [

    {
      nombre: 'Roberto García',
      rol: 'Dueño',
      perfil: EPerfilUsuario.Dueno,
      email: 'roberto.garcia@glutn.com',
      password: 'Glutn2026',
      foto: this.obtenerFoto('roberto-garcia.jpg'),
    },

    {
      nombre: 'Marcela Fernández',
      rol: 'Supervisor',
      perfil: EPerfilUsuario.Supervisor,
      email: 'marcela.fernandez@glutn.com',
      password: 'Glutn2026',
      foto: this.obtenerFoto('marcela-fernandez.jpg'),
    },

    {
      nombre: 'Nicolás Rodríguez',
      rol: 'Metre',
      perfil: EPerfilUsuario.Metre,
      email: 'nicolas.rodriguez@glutn.com',
      password: 'Glutn2026',
      foto: this.obtenerFoto('nicolas-rodriguez.jpg'),
    },

    {
      nombre: 'Lucas Martínez',
      rol: 'Mozo',
      perfil: EPerfilUsuario.Mozo,
      email: 'lucas.martinez@glutn.com',
      password: 'Glutn2026',
      foto: this.obtenerFoto('lucas-martinez.jpg'),
    },

    {
      nombre: 'Federico Sosa',
      rol: 'Cocinero',
      perfil: EPerfilUsuario.Cocinero,
      email: 'federico.sosa@glutn.com',
      password: 'Glutn2026',
      foto: this.obtenerFoto('federico-sosa.jpg'),
    },

    {
      nombre: 'Andrea Torres',
      rol: 'Cantinero',
      perfil: EPerfilUsuario.Cantinero,
      email: 'andrea.torres@glutn.com',
      password: 'Glutn2026',
      foto: this.obtenerFoto('andrea-torres.jpg'),
    },

    {
      nombre: 'Lucas Castro',
      rol: 'Cliente registrado',
      perfil: EPerfilUsuario.ClienteRegistrado,
      email: 'lucas.castro@glutn.com',
      password: 'Glutn2026',
      foto: this.obtenerFoto('lucas-castro.jpg'),
    }

  ];

  constructor() {

    addIcons({
      arrowBackOutline,
      personCircleOutline
    });

  }

  private obtenerFoto(nombreArchivo: string): string {

    return this.supabaseService
      .getAvatarUrl(`usuarios/${nombreArchivo}`)
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

    const usuarioAutenticado =
      await this.auth.iniciarsecion({
        email: usuario.email,
        password: usuario.password,
      });

    const perfil =
      this.auth.obtenerPerfil(
        usuarioAutenticado
      );

    this.usuarioIngresando = null;

    if (
      perfil === EPerfilUsuario.ClienteRegistrado ||
      perfil === EPerfilUsuario.ClienteAnonimo
    ) {

      await this.router.navigate(
        ['/home'],
        { replaceUrl: true }
      );

      return;
    }

    await this.router.navigate(
      ['/seleccion-acceso'],
      { replaceUrl: true }
    );

  } catch {
    this.usuarioIngresando = null;

    await this.mostrarError(
      'No se pudo iniciar sesión con este usuario. Verificá que el usuario de prueba exista.'
    );

    await Haptics.vibrate({
      duration: 300
    });

  }

}

       

  private async mostrarError(
    message: string
  ): Promise<void> {

    const toast =
      await this.toastController.create({

        message,

        duration: 4000,

        position: 'top'

      });

    await toast.present();

  }

}