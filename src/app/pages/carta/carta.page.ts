import { Component } from '@angular/core';
import { IonContent, IonButton, IonHeader, IonToolbar, IonButtons } from '@ionic/angular';
import { Router } from '@angular/router';
import { TipoCarta } from '../../models/carta.model';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';

@Component({
  selector: 'app-carta',
  standalone: true,
  templateUrl: './carta.page.html',
  styleUrls: ['./carta.page.scss'],
  imports: [IonContent, IonButton, IonHeader, IonToolbar, IonButtons, ConfirmVolverComponent],
})
export class CartaPage {

  constructor(private router: Router) {}

  irA(tipo: TipoCarta): void {
    this.router.navigate(['/carta', tipo]);
  }

  volver(){
    this.router.navigate(["/home"])
  }
}