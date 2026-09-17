import { Routes } from '@angular/router';

import { authGuard, staffGuard, roleGuard } from './guards/auth.guard';
import { navegacionInternaGuard } from './guards/navegacion-interna.guard';
import { EPerfilUsuario } from './enums';

export const routes: Routes = [
  {
    path: '',

    loadComponent: () =>
      import('./pages/splash-screen/splash-screen.page').then(
        (m) => m.SplashScreenPage
      ),
  },

  {
    path: 'login',

    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
  },

  {
    path: 'register',

    loadComponent: () =>
      import('./pages/register/register.page').then((m) => m.RegisterPage),
  },

  {
    path: 'acceso_rapido',

    loadComponent: () =>
      import('./pages/quick-access/quick-access.page').then(
        (m) => m.QuickAccessPage
      ),
  },

  {
    path: 'guest',
    loadComponent: () =>
      import('./pages/guest/guest.page').then((m) => m.GuestPage),
  },

  {
    path: 'seleccion-acceso',

    canActivate: [staffGuard],

    loadComponent: () =>
      import('./pages/access-selection/access-selection.page').then(
        (m) => m.AccessSelectionPage
      ),
  },

  {
    path: 'admin',

    canActivate: [authGuard, staffGuard],

    loadComponent: () =>
      import('./pages/admin/admin.page').then((m) => m.AdminPage),
  },

  {
  path: 'admin/clients',
  loadComponent: () =>
    import('./pages/clients/clients.page').then(
      (m) => m.ClientsPage
    ),
  },

  {
    path: 'home',

    canActivate: [authGuard],

    loadComponent: () =>
      import('./pages/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'admin/tables',
    loadComponent: () =>
      import('./pages/tables/tables.page').then((m) => m.TablesPage),
  },
  {
    path: 'admin/drinks',
    loadComponent: () =>
      import('./pages/drinks/drinks.page').then((m) => m.DrinksPage),
  },
  {
    path: 'admin/drinks/create',
    loadComponent: () =>
      import('./pages/drinks/components/create-drink/create-drink.page').then(
        (m) => m.CreateDrinkPage
      ),
  },
  {
    path: 'admin/drinks/edit/:id',
    loadComponent: () =>
      import('./pages/drinks/components/edit-drink/edit-drink.page').then(
        (m) => m.EditDrinkPage
      ),
  },
  {
    path: 'admin/dishes',

    canActivate: [authGuard, roleGuard],
    data: { roles: [EPerfilUsuario.Cocinero] },

    loadComponent: () =>
      import('./pages/dishes/dishes.page').then((m) => m.DishesPage),
  },
  {
    path: 'admin/dishes/create',

    canActivate: [authGuard, roleGuard],
    data: { roles: [EPerfilUsuario.Cocinero] },

    loadComponent: () =>
      import('./pages/dishes/components/create-dish/create-dish.page').then(
        (m) => m.CreateDishPage
      ),
  },
  {
    path: 'admin/dishes/edit/:id',

    canActivate: [authGuard, roleGuard],
    data: { roles: [EPerfilUsuario.Cocinero] },

    loadComponent: () =>
      import('./pages/dishes/components/edit-dish/edit-dish.page').then(
        (m) => m.EditDishPage
      ),
  },
  {
    path: 'admin/postres',

    canActivate: [authGuard, roleGuard],
    data: { roles: [EPerfilUsuario.Cocinero] },

    loadComponent: () =>
      import('./pages/postres/postres.page').then((m) => m.PostresPage),
  },
  {
    path: 'admin/postres/create',

    canActivate: [authGuard, roleGuard],
    data: { roles: [EPerfilUsuario.Cocinero] },

    loadComponent: () =>
      import('./pages/postres/components/create-postre/create-postre.page').then(
        (m) => m.CreatePostrePage
      ),
  },
  {
    path: 'admin/postres/edit/:id',

    canActivate: [authGuard, roleGuard],
    data: { roles: [EPerfilUsuario.Cocinero] },

    loadComponent: () =>
      import('./pages/postres/components/edit-postre/edit-postre.page').then(
        (m) => m.EditPostrePage
      ),
  },
  {
    path: 'juegos',

    canActivate: [authGuard, navegacionInternaGuard],

    loadComponent: () =>
      import('./pages/juegos/juegos.page').then((m) => m.JuegosPage),
  },
  {
    path: 'juegos/ruleta',

    canActivate: [authGuard, navegacionInternaGuard],

    loadComponent: () =>
      import('./pages/juegos/ruleta/ruleta.page').then((m) => m.RuletaPage),
  },
  {
    path: 'juegos/sopa-de-letras',

    canActivate: [authGuard, navegacionInternaGuard],

    loadComponent: () =>
      import('./pages/juegos/sopa-letras/sopa-letras.page').then((m) => m.SopaLetrasPage),
  },
  {
    path: 'juegos/ta-te-ti',

    canActivate: [authGuard, navegacionInternaGuard],

    loadComponent: () =>
      import('./pages/juegos/ta-te-ti/ta-te-ti.page').then((m) => m.TaTeTiPage),
  },
  {
    path: 'reservas',

    canActivate: [authGuard],

    loadComponent: () =>
      import('./pages/reservas/reservas.page').then((m) => m.ReservasPage),
  },
  {
    path: 'reservas/nueva',

    canActivate: [authGuard],

    loadComponent: () =>
      import('./pages/reservas/nueva-reserva/nueva-reserva.page').then((m) => m.NuevaReservaPage),
  },
  {
    path: 'reservas/mis-reservas',

    canActivate: [authGuard],

    loadComponent: () =>
      import('./pages/reservas/mis-reservas/mis-reservas.page').then((m) => m.MisReservasPage),
  },
  {
    path: 'carta',
    loadComponent: () =>
      import('./pages/carta/carta.page').then((m) => m.CartaPage),
  },
  {
    path: 'carta/:tipo',
    loadComponent: () =>
      import('./pages/productos/productos.page').then((m) => m.ProductosPage),
  },
  {
    path: 'design-system',
    loadComponent: () =>
      import('./pages/design-system/design-system.page').then(
        (m) => m.DesignSystemPage
      ),
  },
  {path: 'chat',
      loadComponent: () => import('./pages/chat/chat.page').then(m => m.ChatPage)
  },
];
