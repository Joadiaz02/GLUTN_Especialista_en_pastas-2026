import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

// evita entrar por url a pantallas que solo se abren navegando
export const navegacionInternaGuard: CanActivateFn = () => {
  const router = inject(Router);

  const navegacion = router.getCurrentNavigation();
  const origenValido = navegacion?.extras?.state?.['origenValido'] === true;

  if (origenValido) {
    return true;
  }

  return router.createUrlTree(['/home']);
};
