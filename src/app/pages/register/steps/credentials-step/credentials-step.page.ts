import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  AbstractControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { IonInput } from '@ionic/angular';
import { VibrarErrores } from '@app/directives/vibrar-errores';

@Component({
  selector: 'app-credentials-step',
  templateUrl: './credentials-step.page.html',
  styleUrls: ['./credentials-step.page.scss'],
  imports: [CommonModule, ReactiveFormsModule, VibrarErrores, IonInput],
})
export class CredentialsStepPage {
  @Input() control!: AbstractControl;

  get formGroup(): FormGroup {
    return this.control as FormGroup;
  }

  getFormControl(controlName: string) {
    return this.formGroup.get(controlName);
  }

  get passwordMismatch(): boolean {
    const confirm = this.formGroup.get('confirmPassword');

    return (
      !!this.formGroup?.hasError('passwordMismatch') &&
      !!(confirm?.touched || confirm?.dirty)
    );
  }
}