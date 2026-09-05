import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-drink-card',
  templateUrl: './drink-card.component.html',
  styleUrls: ['./drink-card.component.scss'],
  imports: [CommonModule],
})
export class DrinkCardComponent {
  name = input<string>();
  description = input<string>();
  price = input<number>();
  image = input<string>();
}
