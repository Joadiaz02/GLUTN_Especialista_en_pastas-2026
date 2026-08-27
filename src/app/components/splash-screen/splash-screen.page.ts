import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './splash-screen.page.html',
  styleUrls: ['./splash-screen.page.scss']
})
export class SplashScreenPage implements OnInit {

  isFadingOut = false;

  constructor(private router: Router) {}

  ngOnInit(): void {

    setTimeout(() => {
      this.isFadingOut = true;
    }, 4000);

    setTimeout(() => {
      this.router.navigate(['/login']);
    }, 4500);

  }

}