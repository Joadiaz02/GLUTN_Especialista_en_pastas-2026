import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonList, IonItem, IonLabel, IonIcon, PopoverController } from '@ionic/angular';

type Disponibilidad = 'vacia' | 'ocupada' | 'reservada';

@Component({
  selector: 'app-selector-disponibilidad',
  standalone: true,
  imports: [CommonModule, IonList, IonItem, IonLabel, IonIcon],
  template: `
    <ion-list lines="none">
      @for (opcion of opciones; track opcion.valor) {
        <ion-item button (click)="elegir(opcion.valor)">
          <ion-icon [name]="opcion.icono" slot="start" [color]="opcion.color"></ion-icon>
          <ion-label>{{ opcion.etiqueta }}</ion-label>
          @if (actual === opcion.valor) {
            <ion-icon name="checkmark-outline" slot="end"></ion-icon>
          }
        </ion-item>
      }
    </ion-list>
  `,
})
export class SelectorDisponibilidadComponent {
  @Input({ required: true }) actual!: Disponibilidad;

  private _popoverCtrl = inject(PopoverController);

  readonly opciones: { valor: Disponibilidad; etiqueta: string; icono: string; color: string }[] = [
    { valor: 'vacia', etiqueta: 'Vacía', icono: 'checkmark-circle-outline', color: 'success' },
    { valor: 'ocupada', etiqueta: 'Ocupada', icono: 'restaurant-outline', color: 'danger' },
    { valor: 'reservada', etiqueta: 'Reservada', icono: 'time-outline', color: 'warning' },
  ];

  elegir(valor: Disponibilidad): void {
    void this._popoverCtrl.dismiss(valor);
  }
}