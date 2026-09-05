import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AdminModule } from '@app/models/admin.model';

import { IonCard, IonCardContent, IonIcon } from '@ionic/angular';

@Component({
  selector: 'app-admin-module-card',
  standalone: true,
  imports: [IonCard, IonCardContent, IonIcon],
  templateUrl: './admin-module-card.component.html',
  styleUrls: ['./admin-module-card.component.scss'],
})
export class AdminModuleCardComponent {
  @Input() module!: AdminModule;

  @Output() selected = new EventEmitter<AdminModule>();

  seleccionar(): void {
    this.selected.emit(this.module);
  }
}
