import { ErrorHandler } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

import {
  RouteReuseStrategy,
  provideRouter,
  withComponentInputBinding,
  withPreloading,
  PreloadAllModules,
} from '@angular/router';

import {
  IonicRouteStrategy,
  provideIonicAngular,
} from '@ionic/angular';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

import { GlobalErrorHandler } from './app/services/global-error-handler';

bootstrapApplication(
  AppComponent,
  {
    providers: [
      {
        provide: ErrorHandler,
        useClass: GlobalErrorHandler,
      },

      {
        provide: RouteReuseStrategy,
        useClass: IonicRouteStrategy,
      },

      provideIonicAngular(),

      provideRouter(
        routes,
        withPreloading(
          PreloadAllModules
        ),
        withComponentInputBinding()
      ),

      provideIonicAngular({
        mode: 'md',
      }),
    ],
  }
);