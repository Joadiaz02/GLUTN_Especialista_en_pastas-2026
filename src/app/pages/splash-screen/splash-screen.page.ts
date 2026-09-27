import {
  Component,
  OnInit,
  inject,
} from '@angular/core';

import { Router } from '@angular/router';

import { Vibracion } from '@app/services/vibracion';

@Component({
  selector: 'app-splash-screen',
  templateUrl:
    './splash-screen.page.html',
  styleUrls: [
    './splash-screen.page.scss',
  ],
})
export class SplashScreenPage
  implements OnInit {

  private readonly router = inject(Router);

  private readonly vibracion =inject(Vibracion);

  isFadingOut = false;

  ngOnInit(): void {

    this.vibracion.sonidoInicio();

    setTimeout(() => {
      this.isFadingOut = true;
    }, 4000);

    setTimeout(() => {
      this.router.navigate(
        ['/login'],
        {
          replaceUrl: true,
        }
      );
    }, 4500);
  }
}