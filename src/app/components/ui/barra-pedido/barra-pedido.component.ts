import {
  Component,
  inject,
  Input,
} from '@angular/core';

import {
  CurrencyPipe,
} from '@angular/common';

import {
  IonButton,
} from '@ionic/angular';

import {
  PedidoSheetService,
} from '@app/services/pedido-sheet/pedido-sheet';

import {
  Carrito,
} from '@app/pages/carrito/carrito';


@Component({
  selector: 'app-barra-pedido',

  standalone: true,

  imports: [
    IonButton,
    CurrencyPipe,
  ],

  templateUrl:
    './barra-pedido.component.html',

  styleUrl:
    './barra-pedido.component.scss',
})
export class BarraPedidoComponent {

  carrito = inject(Carrito);

  private pedidoSheet =
    inject(PedidoSheetService);


  @Input()
  textoBoton = 'Ver pedido';


  abrirPedido(): void {

    this.pedidoSheet.abrir();

  }


  tiempoTexto(): string {

    const minutos =
      this.carrito.tiempoTotalEstimado();

    if (minutos <= 0) {
      return '0 ';
    }

    if (minutos < 60) {
      return `${minutos} `;
    }

    const horas =Math.floor(minutos / 60);

    const resto =minutos % 60;

    if (resto === 0) {
      return `${horas} h`;
    }

    return `${horas}h ${resto} min`;

  }

}