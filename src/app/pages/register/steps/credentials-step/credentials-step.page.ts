import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
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
  IonButton,
  IonInput,
  IonIcon,
  IonNote,
  IonButtons,
  IonBackButton,
} from '@ionic/angular';

@Component({
  selector: 'app-credentials-step',
  templateUrl: './credentials-step.page.html',
  styleUrls: ['./credentials-step.page.scss'],
  imports: [CommonModule, ReactiveFormsModule, IonInput],
})
export class CredentialsStepPage {
  @Input() control!: AbstractControl;

  get formGroup(): FormGroup {
    return this.control as FormGroup;
  }

  getFormControl(controlName: string) {
    return this.formGroup.get(controlName);
  }
}
