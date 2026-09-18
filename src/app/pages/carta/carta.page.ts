import { Component, inject } from '@angular/core';
import { IonContent, IonButton, IonHeader, IonToolbar, IonButtons } from '@ionic/angular';
import { Router } from '@angular/router';
import { TipoCarta } from '../../models/carta.model';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { BarraPedidoComponent } from '@app/components/ui/barra-pedido/barra-pedido.component';
import { Carrito } from '../carrito/carrito';

@Component({
  selector: 'app-carta',
  standalone: true,
  templateUrl: './carta.page.html',
  styleUrls: ['./carta.page.scss'],
  imports: [IonContent, IonButton, IonHeader, IonToolbar, IonButtons, ConfirmVolverComponent, BarraPedidoComponent],
})
export class CartaPage {
  public carrito = inject(Carrito);
  constructor(private router: Router
    
  ) {}

  irA(tipo: TipoCarta): void {
    this.router.navigate(['/carta', tipo]);
  }

  volver(){
    this.router.navigate(["/home"])
  }

}