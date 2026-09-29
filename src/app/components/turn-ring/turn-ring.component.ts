import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-turn-ring',
  templateUrl: './turn-ring.component.html',
  styleUrls: ['./turn-ring.component.scss'],
  imports: [],
})
export class TurnRingComponent {
  position = input.required<number>();
  total = input.required<number>();

  private readonly _radio = 80;
  private readonly _circunferencial = 2 * Math.PI * this._radio;

  progress = computed(() => {
    const total = Math.max(this.total(), 1);
    const posicion = Math.max(this.position(), 1);
    return 1 - (posicion - 1) / total;
  });

  dashoffset = computed(() => this._circunferencial * (1 - this.progress()));
  circunferencial = this._circunferencial;
  radio = this._radio;
}
