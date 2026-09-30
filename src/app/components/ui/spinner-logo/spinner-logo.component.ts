import { Component, input } from '@angular/core';

// spinner con el logo para todas las esperas
@Component({
  selector: 'app-spinner-logo',
  templateUrl: './spinner-logo.component.html',
  styleUrl: './spinner-logo.component.scss',
})
export class SpinnerLogoComponent {
  // tamaño chico para botones, mediano para pantalla completa
  size = input<'sm' | 'md'>('md');
}
