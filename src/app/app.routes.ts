import { Routes } from '@angular/router';
import { SplashScreenPage } from './components/splash-screen/splash-screen.page';
import { LoginPage } from './components/login/login.page';

export const routes: Routes = [

  {
    path: '',
    component: SplashScreenPage
  },

  {
    path: 'login',
    component: LoginPage
  },
  {
    path: 'home',
    loadComponent: () => import('./components/home/home.component').then(arch => arch.HomeComponent)
  }

];
