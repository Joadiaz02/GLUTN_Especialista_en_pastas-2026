import { Component, inject, Output, EventEmitter, Input } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular';
import { CurrencyPipe } from '@angular/common';
import { addIcons } from 'ionicons';
import { timeOutline } from 'ionicons/icons';
import { Carrito } from '../../../pages/carrito/carrito';
import { Router } from '@angular/router';

@Component({
  selector: 'app-barra-pedido',
  imports: [IonButton, CurrencyPipe],
  templateUrl: './barra-pedido.component.html',
  styleUrl: './barra-pedido.component.scss'
})
export class BarraPedidoComponent {
  carrito = inject(Carrito);
  rout = inject(Router)

  @Input() textoBoton = 'Completar pedido';
  @Output() continuar = new EventEmitter<void>();

  constructor() {
    addIcons({ timeOutline });
  }

  continuarPedido(): void {
  const resumen = {
    items: this.carrito.items(),
    total: this.carrito.importeTotal(),
    tiempoEstimado: this.carrito.tiempoTotalEstimado()
  };
    console.log(resumen)
    this.rout.navigate(["/pedido"])
  }
}