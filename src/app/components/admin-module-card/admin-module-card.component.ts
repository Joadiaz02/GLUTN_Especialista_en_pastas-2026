import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AdminModule } from '@app/models/admin.model';

import { IonCard, IonCardContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { iceCreamOutline, chevronForwardOutline } from 'ionicons/icons';

@Component({
  selector: 'app-admin-module-card',
  standalone: true,
  imports: [IonCard, IonCardContent, IonIcon],
  templateUrl: './admin-module-card.component.html',
  styleUrls: ['./admin-module-card.component.scss'],
})
export class AdminModuleCardComponent {
  @Input() module!: AdminModule;
  @Input() icon!: string;

  @Output() selected = new EventEmitter<AdminModule>();

  constructor() {
    addIcons({
      'ice-cream-outline': iceCreamOutline,
      'chevron-forward-outline': chevronForwardOutline,
    });
  }

  seleccionar(): void {
    this.selected.emit(this.module);
  }
}
