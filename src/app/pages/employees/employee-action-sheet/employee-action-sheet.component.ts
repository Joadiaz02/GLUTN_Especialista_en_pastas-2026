import { Component, inject, input, OnInit } from '@angular/core';
import { IonButton, ModalController } from '@ionic/angular';

@Component({
  selector: 'app-employee-action-sheet',
  templateUrl: './employee-action-sheet.component.html',
  styleUrls: ['./employee-action-sheet.component.scss'],
  imports: [IonButton],
})
export class EmployeeActionSheetComponent {
  private readonly _modalController = inject(ModalController);
 
  employee: any;
 
  select(action: any): void {
    void this._modalController.dismiss(null, action);
  }
 
  cancel(): void {
    void this._modalController.dismiss(null, 'cancel');
  }
}
