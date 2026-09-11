import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular';

@Component({
  selector: 'app-design-system',
  templateUrl: './design-system.page.html',
  styleUrls: ['./design-system.page.scss'],
  imports: [IonContent, CommonModule, FormsModule],
})
export class DesignSystemPage {}
