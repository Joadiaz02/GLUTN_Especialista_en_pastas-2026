import {
  Component,
  inject
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  Router
} from '@angular/router';

import {
  IonContent,
  IonIcon
} from '@ionic/angular';

import {
  addIcons
} from 'ionicons';

import {
  restaurantOutline,
  settingsOutline,
  logOutOutline,
  personCircleOutline
} from 'ionicons/icons';

import { Auth } from '../../services/auth/auth';

import type {
  PerfilUsuario
} from '../../models/usuario.model';


@Component({
  selector: 'app-access-selection',

  standalone: true,

  imports: [
    CommonModule,
    IonContent,
    IonIcon
  ],

  templateUrl:
    './access-selection.page.html',

  styleUrl:
    './access-selection.page.scss',
})
export class AccessSelectionPage {

  private readonly auth =
    inject(Auth);

  private readonly router =
    inject(Router);


  perfil:
    PerfilUsuario | null = null;


  nombre =
    'Usuario';


  constructor() {

    addIcons({

      restaurantOutline,

      settingsOutline,

      logOutOutline,

      personCircleOutline

    });


    const usuario =
      this.auth.usuarioActual();


    this.perfil =
      this.auth.obtenerPerfil(
        usuario
      );


    this.nombre =
      usuario?.user_metadata?.['nombre']
      ?? usuario?.email
      ?? 'Usuario';
  }


  irAlMenuPrincipal(): void {

    void this.router.navigate([
      '/home'
    ]);
  }


  irAlPanelAdministrativo(): void {

    void this.router.navigate([
      '/admin'
    ]);
  }


  async cerrarSesion(): Promise<void> {

    await this.auth.logout();

    void this.router.navigate([
      '/login'
    ]);
  }


  get perfilNombre(): string {

    const nombres:
      Record<string, string> = {

        dueno:
          'Dueño',

        supervisor:
          'Supervisor',

        metre:
          'Metre',

        mozo:
          'Mozo',

        cocinero:
          'Cocinero',

        cantinero:
          'Cantinero'

      };


    return this.perfil
      ? (
          nombres[this.perfil]
          ?? 'Personal'
        )
      : 'Personal';
  }
}