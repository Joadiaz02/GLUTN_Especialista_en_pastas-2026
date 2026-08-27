import { Routes } from '@angular/router';
import { SplashScreenPage } from './components/splash-screen/splash-screen.page';
import { LoginPage } from './components/login/login.page';
import { HomePage } from './pages/home/home.page';

export const routes: Routes = [
  {
    path: '',
    component: SplashScreenPage,
  },

  // {
  //   path: 'login',
  //   component: LoginPage,
  // },

  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./pages/home/home.page').then((m) => m.HomePage),
  },

  // {
  //   path: 'register',
  //   loadChildren: () =>
  //     import('./pages/register/register.routes').then((m) => m.routes),
  // },
];
