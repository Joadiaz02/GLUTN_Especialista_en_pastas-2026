
import { Component, inject } from '@angular/core';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-encuestas',
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonButton],
  templateUrl: './encuestas.page.html',
  styleUrl: './encuestas.page.scss',
})
export class EncuestasPage {
  private router = inject(Router);

  volver(): void {
    void this.router.navigate(['/waiting-room']);
  }
}
