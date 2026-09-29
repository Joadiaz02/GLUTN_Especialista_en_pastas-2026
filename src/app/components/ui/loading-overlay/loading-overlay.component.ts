import { Component, input } from '@angular/core';
import { SpinnerLogoComponent } from '../spinner-logo/spinner-logo.component';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [SpinnerLogoComponent],
  templateUrl: './loading-overlay.component.html',
  styleUrl: './loading-overlay.component.scss',
})
export class LoadingOverlayComponent {
  mensaje = input<string>('');
}