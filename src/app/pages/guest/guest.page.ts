import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonFooter,
  IonButton,
} from '@ionic/angular';
import { ProgressBarComponent } from '@app/components';
import { IdentityStepPage } from './steps/identity-step/identity-step.page';
import { LocationStepPage } from './steps/location-step/location-step.page';

@Component({
  selector: 'app-guest',
  templateUrl: './guest.page.html',
  styleUrls: ['./guest.page.scss'],
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    IonButtons,
    IonBackButton,
    ProgressBarComponent,
    IonFooter,
    IonButton,
    IdentityStepPage,
    ReactiveFormsModule,
    LocationStepPage,
  ],
})
export class GuestPage {
  form = new FormGroup({
    file: new FormControl<File | null>(null, Validators.required),
    fullName: new FormControl('', Validators.required),
  });

  currentStep = signal<number>(1);

  getStepTitle(): string {
    switch (this.currentStep()) {
      case 1:
        return 'Invitado';

      case 2:
        return 'Escaneo';

      default:
        return '';
    }
  }

  nextStep(): void {
    const step = this.currentStep();

    if (step < 3) {
      this.currentStep.update((current) => current + 1);
    }
  }

  previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update((current) => current - 1);
    }
  }
}
