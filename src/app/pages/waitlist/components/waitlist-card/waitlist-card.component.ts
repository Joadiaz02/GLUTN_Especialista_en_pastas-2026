import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-waitlist-card',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './waitlist-card.component.html',
  styleUrls: ['./waitlist-card.component.scss'],
})
export class WaitlistCardComponent {
  @Input({ required: true })
  entry!: any;

  @Input()
  posicion: 'activa' | 'anterior' | 'siguiente' | 'oculta' = 'oculta';

  @Input()
  deshabilitada = false;

  @Output()
  asignar = new EventEmitter<any>();

  @Output()
  quitar = new EventEmitter<any>();

  get clasePosicion(): string {
    return `carta-${this.posicion}`;
  }

  get comensales(): number {
    return Number(this.entry?.comensales ?? 1);
  }

  // texto de cada consideración guardada
  textoConsideracion(consideracion: string): string {
    if (consideracion === 'movilidad_reducida') {
      return 'Movilidad reducida';
    }

    if (consideracion === 'silla_bebe') {
      return 'Silla para bebé';
    }

    return 'Otra consideración';
  }

  onAsignar(): void {
    if (this.deshabilitada) {
      return;
    }

    this.asignar.emit(this.entry);
  }

  onQuitar(): void {
    if (this.deshabilitada) {
      return;
    }

    this.quitar.emit(this.entry);
  }
}
