import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

// Evita que se entre directo por URL, recarga en frío, o un link externo
// a pantallas que solo deberían alcanzarse navegando dentro de la app
// (ej. Home -> Juegos -> Ruleta, o volviendo con el boton "volver").
// Quien navega tiene que marcar la navegación como válida a propósito:
//   router.navigate(['/juegos'], { state: { origenValido: true } })
//   <a [routerLink]="ruta" [state]="{ origenValido: true }">
// Angular conserva ese "state" al usar el back/forward del navegador,
// así que volver con el botón nativo también sigue funcionando.
export const navegacionInternaGuard: CanActivateFn = () => {
  const router = inject(Router);

  const navegacion = router.getCurrentNavigation();
  const origenValido = navegacion?.extras?.state?.['origenValido'] === true;

  if (origenValido) {
    return true;
  }

  return router.createUrlTree(['/home']);
};
