import { Component, inject } from '@angular/core';
import { IonIcon, ModalController } from '@ionic/angular';

@Component({
  selector: 'app-upload-options',
  templateUrl: './upload-options.component.html',
  styleUrls: ['./upload-options.component.scss'],
  imports: [IonIcon],
})
export class UploadOptionsComponent {
  private _modalController = inject(ModalController);

  select(source: 'camera' | 'gallery') {
    this._modalController.dismiss({ source }, 'confirm');
  }
}
