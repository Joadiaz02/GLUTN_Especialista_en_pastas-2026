import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

// evita entrar por url a pantallas que solo se abren navegando
export const navegacionInternaGuard: CanActivateFn = () => {
  const router = inject(Router);

  const navegacion = router.getCurrentNavigation();
  const origenValido = navegacion?.extras?.state?.['origenValido'] === true;

  // si ya se venía navegando dentro de la app, no es una entrada por url
  const desdeLaApp = navegacion?.previousNavigation != null;

  if (origenValido || desdeLaApp) {
    return true;
  }

  return router.createUrlTree(['/home']);
};
