import {
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

@Component({
  selector: 'app-clients-navigation',
  standalone: true,
  templateUrl: './clients-navigation.component.html',
  styleUrls: ['./clients-navigation.component.scss'],
})
export class ClientsNavigationComponent {
  @Input()
  posicionActual = 0;

  @Input()
  totalClientes = 0;

  @Input()
  deshabilitada = false;
  
  @Input()
  showButtons = true;
  
  @Input()
  message = 'Deslizá para cambiar de cliente';

  @Output()
  anterior = new EventEmitter<void>();

  @Output()
  siguiente = new EventEmitter<void>();

  irAnterior(): void {
    if (this.deshabilitada) {
      return;
    }

    this.anterior.emit();
  }

  irSiguiente(): void {
    if (this.deshabilitada) {
      return;
    }

    this.siguiente.emit();
  }
}