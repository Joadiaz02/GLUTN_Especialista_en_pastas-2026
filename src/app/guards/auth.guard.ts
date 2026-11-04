import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router
} from '@angular/router';

import { Auth } from '../services/auth/auth';
import { EPerfilUsuario } from '../enums';


export const authGuard: CanActivateFn =
  async () => {

    const auth = inject(Auth);
    const router = inject(Router);

    const usuario =
      await auth.obtenerUsuarioActual();

    if (!usuario) {

      return router.createUrlTree([
        '/login'
      ]);

    }

    return true;
  };


export const staffGuard: CanActivateFn =
  async () => {

    const auth = inject(Auth);
    const router = inject(Router);

    const usuario =
      await auth.obtenerUsuarioActual();

    if (!usuario) {

      return router.createUrlTree([
        '/login'
      ]);

    }

    const perfil =
      auth.obtenerPerfil(usuario);


    const perfilesStaff = [

      EPerfilUsuario.Dueno,

      EPerfilUsuario.Supervisor,

      EPerfilUsuario.Metre,

      EPerfilUsuario.Mozo,

      EPerfilUsuario.Cocinero,

      EPerfilUsuario.Cantinero

    ];


    if (
      perfilesStaff.includes(
        perfil as EPerfilUsuario
      )
    ) {

      return true;

    }


    return router.createUrlTree([
      '/home'
    ]);
  };


export const roleGuard: CanActivateFn =
  async (route) => {

    const auth = inject(Auth);
    const router = inject(Router);

    const usuario =
      await auth.obtenerUsuarioActual();

    if (!usuario) {

      return router.createUrlTree([
        '/login'
      ]);

    }


    const perfil =
      auth.obtenerPerfil(usuario);


    const rolesPermitidos =
      route.data?.['roles'] as
      | EPerfilUsuario[]
      | undefined;


    if (
      !rolesPermitidos ||
      rolesPermitidos.length === 0
    ) {

      return true;

    }


    if (
      rolesPermitidos.includes(
        perfil as EPerfilUsuario
      )
    ) {

      return true;

    }


    // sin permiso para esta pantalla: vuelve a su pantalla principal
    return router.createUrlTree([
      pantallaPrincipal(auth, usuario)
    ]);
  };


// ruta que no existe (**): manda a cada uno a su pantalla principal
export const rutaInexistenteGuard: CanActivateFn =
  async () => {

    const auth = inject(Auth);
    const router = inject(Router);

    const usuario =
      await auth.obtenerUsuarioActual();

    if (!usuario) {

      return router.createUrlTree([
        '/login'
      ]);

    }


    return router.createUrlTree([
      pantallaPrincipal(auth, usuario)
    ]);
  };


// el personal va a su panel y el cliente al home; sin perfil, termina el registro con la red social
function pantallaPrincipal(auth: Auth, usuario: any): string {

  if (!auth.obtenerPerfil(usuario)) {

    return '/registro/social';

  }


  return auth.esPersonal(usuario)
    ? '/admin'
    : '/home';
}