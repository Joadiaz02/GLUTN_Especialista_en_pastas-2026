import { Routes } from '@angular/router';

import {
  authGuard,
  staffGuard
} from './guards/auth.guard';


export const routes: Routes = [

  {
    path: '',

    loadComponent: () =>
      import(
        './pages/splash-screen/splash-screen.page'
      ).then(
        (m) => m.SplashScreenPage
      ),
  },


  {
    path: 'login',

    loadComponent: () =>
      import(
        './pages/login/login.page'
      ).then(
        (m) => m.LoginPage
      ),
  },


  {
    path: 'register',

    loadComponent: () =>
      import(
        './pages/register/register.page'
      ).then(
        (m) => m.RegisterPage
      ),
  },


  {
    path: 'seleccion-acceso',

    canActivate: [
      staffGuard
    ],

    loadComponent: () =>
      import(
        './pages/access-selection/access-selection.page'
      ).then(
        (m) => m.AccessSelectionPage
      ),
  },


  {
    path: 'admin',

    canActivate: [
      authGuard,
      staffGuard
    ],

    loadComponent: () =>
      import(
        './pages/admin/admin.page'
      ).then(
        (m) => m.AdminPage
      ),
  },


  {
    path: 'home',

    loadComponent: () =>
      import(
        './components/home/home.component'
      ).then(
        (m) => m.HomeComponent
      ),
  },

];