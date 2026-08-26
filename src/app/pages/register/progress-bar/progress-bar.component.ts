import { Component, computed, Input, OnInit, signal } from '@angular/core';

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

  // Recibe la cantidad total de pasos (por defecto 3)
  @Input() totalSteps: number = 3;

  private _currentStep = signal<number>(1);

  // Genera un arreglo basado en el total de pasos para iterarlo en la plantilla [0, 1, 2]
  stepsArray = computed(() =>
    Array.from({ length: this.totalSteps }, (_, i) => i + 1),
  );

  // Determina si una barra específica debe pintarse como activa/completada
  isStepActive(stepIndex: number): boolean {
    return stepIndex <= this._currentStep();
  }
}
