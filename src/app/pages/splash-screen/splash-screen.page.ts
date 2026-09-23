import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-splash-screen',
  templateUrl: './splash-screen.page.html',
  styleUrls: ['./splash-screen.page.scss'],
})
export class SplashScreenPage implements OnInit {
  private router = inject(Router);

  isFadingOut = false;

  ngOnInit(): void {
    setTimeout(() => {
      this.isFadingOut = true;
    }, 4000);

    setTimeout(() => {
      this.router.navigate(['/login'], { replaceUrl: true });
    }, 4500);
  }
}
