import { Component } from '@angular/core';
import { IonContent, IonButton, IonHeader, IonToolbar, IonButtons, IonBackButton } from '@ionic/angular';
import { Router } from '@angular/router';
import { TipoCarta } from '../../models/carta.model';

@Component({
  selector: 'app-carta',
  standalone: true,
  templateUrl: './carta.page.html',
  styleUrls: ['./carta.page.scss'],
  imports: [IonContent, IonButton, IonHeader, IonToolbar, IonButtons, IonBackButton],
})
export class CartaPage {

  constructor(private router: Router) {}

  irA(tipo: TipoCarta): void {
    this.router.navigate(['/carta', tipo]);
  }
}
