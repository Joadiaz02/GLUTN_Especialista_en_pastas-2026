import { Component, computed, Input, signal } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  templateUrl: './progress-bar.component.html',
  styleUrls: ['./progress-bar.component.scss'],
  imports: [],
})
export class ProgressBarComponent {
  @Input({ required: true }) set currentStep(value: number) {
    this._currentStep.set(value);
  }

  @Input() totalSteps: number = 3;

  private _currentStep = signal<number>(1);

  stepsArray = computed(() =>
    Array.from({ length: this.totalSteps }, (_, i) => i + 1),
  );

  isStepActive(stepIndex: number): boolean {
    return stepIndex <= this._currentStep();
  }
}
