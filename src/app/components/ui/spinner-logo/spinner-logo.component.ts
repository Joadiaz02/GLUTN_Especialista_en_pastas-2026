import { Component, input } from '@angular/core';

// Spinner con el logo de la empresa, para reutilizar en cualquier
// espera de la app (requisito excluyente del TP: "Indicadores
// visuales (spinners), con el logo de la empresa, en todas las esperas").
@Component({
  selector: 'app-spinner-logo',
  templateUrl: './spinner-logo.component.html',
  styleUrl: './spinner-logo.component.scss',
})
export class SpinnerLogoComponent {
  // 'sm' para usar adentro de un botón, 'md' para una espera de pantalla completa.
  size = input<'sm' | 'md'>('md');
}
