import { Routes } from '@angular/router';

import { authGuard, staffGuard, roleGuard } from './guards/auth.guard';
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
    path: 'admin/drinks/edit',
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
