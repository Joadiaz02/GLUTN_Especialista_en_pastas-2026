import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonIcon,
} from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { DrinkCardComponent } from './components/drink-card/drink-card.component';

@Component({
  selector: 'app-drinks',
  templateUrl: './drinks.page.html',
  styleUrls: ['./drinks.page.scss'],
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonButtons,
    IonBackButton,
    RouterLink,
    DrinkCardComponent,
    IonIcon,
  ],
})
export class DrinksPage {
  drinks = [
    {
      id: 1,
      nombre: '7Up sin azucar 354 ml',
      descripcion: 'Gaseosa',
      imagen: 'https://images.rappi.com.ar/products/955342-1587755959609.png',
      precio: 4000,
    },
    {
      id: 2,
      nombre: 'Pepsi 354ml',
      descripcion: 'Gaseosa',
      imagen: 'https://images.rappi.com.ar/products/955322-1593457721222.png',
      precio: 4000,
    },
    {
      id: 3,
      nombre: 'Cepita Manzana 200 ml',
      descripcion: 'Jugo',
      imagen:
        'https://images.rappi.com.ar/products/ec9e4016-834c-4f37-be6c-2eba509d2ab3.png',
      precio: 2800,
    },
  ];
}
