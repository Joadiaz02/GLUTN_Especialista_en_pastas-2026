import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular';
import { GtnUploader } from '@app/components';

@Component({
  selector: 'app-design-system',
  templateUrl: './design-system.page.html',
  styleUrls: ['./design-system.page.scss'],
  imports: [IonContent, CommonModule, FormsModule, GtnUploader],
})
export class DesignSystemPage {
  onPhotoSelected(index: number, file: File) {
    console.log(index);
    console.log(file);
  }
}
