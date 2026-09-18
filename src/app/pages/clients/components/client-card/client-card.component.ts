import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Usuario } from '@app/models/usuario.model';

@Component({
  selector: 'app-client-card',
  standalone: true,
  templateUrl: './client-card.component.html',
  styleUrls: ['./client-card.component.scss'],
})
export class ClientCardComponent {
  @Input({ required: true })
  cliente!: Usuario;

  @Input()
  avatarUrl: string | null = null;

  @Input()
  posicion: 'activa' | 'anterior' | 'siguiente' | 'oculta' = 'oculta';

  @Input()
  saliendo = false;

  @Input()
  deshabilitada = false;

  @Output()
  aprobar = new EventEmitter<Usuario>();

  @Output()
  rechazar = new EventEmitter<Usuario>();

  get clasePosicion(): string {
    return `carta-${this.posicion}`;
  }

  onAprobar(): void {
    if (this.deshabilitada) {
      return;
    }

    this.aprobar.emit(this.cliente);
  }

  onRechazar(): void {
    if (this.deshabilitada) {
      return;
    }

    this.rechazar.emit(this.cliente);
  }
}