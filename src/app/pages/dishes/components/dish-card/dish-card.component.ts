import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { createOutline, trashOutline, star, starOutline, refreshOutline } from 'ionicons/icons';

@Component({
  selector: 'app-dish-card',
  templateUrl: './dish-card.component.html',
  styleUrls: ['./dish-card.component.scss'],
  imports: [CommonModule, IonIcon],
})
export class DishCardComponent {
  name = input<string>();
  description = input<string>();
  price = input<number>();
  image = input<string>();
  sugerencia = input<boolean>(false);
  bajaLogica = input<boolean>(false);

  editar = output<void>();
  destacar = output<void>();
  baja = output<void>();
  reactivar = output<void>();

  constructor() {
    addIcons({
      'create-outline': createOutline,
      'trash-outline': trashOutline,
      star,
      'star-outline': starOutline,
      'refresh-outline': refreshOutline,
    });
  }
}
