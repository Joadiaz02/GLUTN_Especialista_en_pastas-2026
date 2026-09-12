import { Component } from '@angular/core';
import { IonContent, IonButton } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-carta',
  standalone: true,
  templateUrl: './carta.page.html',
  styleUrls: ['./carta.page.scss'],
  imports: [IonContent, IonButton],
})
export class CartaPage {

  constructor(private router: Router) {}

  irA(tipo: 'comida' | 'bebida' | 'postre'): void {
    this.router.navigate(['/carta', tipo]);
  }
}
