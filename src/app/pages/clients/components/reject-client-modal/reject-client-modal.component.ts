import {
  Component,
  EventEmitter,
  Input,
  Output,
  inject
} from '@angular/core';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { Vibracion } from '@app/services';
import { Usuario } from '@app/models/usuario.model';

@Component({
  selector: 'app-reject-client-modal',
  standalone: true,
  imports: [SpinnerLogoComponent],
  templateUrl: './reject-client-modal.component.html',
  styleUrls: ['./reject-client-modal.component.scss'],
})
export class RejectClientModalComponent {
  @Input()
  cliente: Usuario | null = null;

  @Input()
  avatarUrl: string | null = null;

  @Input()
  motivo = '';

  @Input()
  procesando = false;

  @Output()
  cerrar = new EventEmitter<void>();

  @Output()
  motivoChange = new EventEmitter<string>();

  @Output()
  confirmar = new EventEmitter<string>();

  private _vibracion = inject(Vibracion);

  actualizarMotivo(event: Event): void {
    const textarea =
      event.target as HTMLTextAreaElement;

    this.motivoChange.emit(
      textarea.value
    );
  }

  cerrarModal(): void {
    if (this.procesando) {
      return;
    }

    this.cerrar.emit();
  }

  confirmarRechazo(): void {
    const motivoLimpio =
      this.motivo.trim();

    if (
      !motivoLimpio ||
      this.procesando
    ) {
      return;
    }

    this.confirmar.emit(
      motivoLimpio
    );
  }
}