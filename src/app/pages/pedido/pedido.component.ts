import { Component, inject, OnInit } from '@angular/core';
import { Pedido } from '@app/services/pedido/pedido';
import { Carrito } from '../carrito/carrito';
import { IonHeader, IonToolbar, IonButtons, IonBackButton, IonContent, IonSearchbar, IonButton } from '@ionic/angular';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { Router } from '@angular/router';
import { ConfirmDialogComponent } from '@app/components/ui/confirm-cartel/confirm-cartel.component';
import { CurrencyPipe } from '@angular/common';


@Component({
  selector: 'app-pedido',
  templateUrl: './pedido.component.html',
  styleUrls: ['./pedido.component.scss'],
  imports: [IonHeader, IonToolbar, IonButtons, IonContent, ConfirmVolverComponent, ConfirmDialogComponent, CurrencyPipe, IonButton],
})
export class PedidoComponent  {
 
  pedido = inject(Pedido);
  carrito = inject(Carrito);
  root = inject(Router);
//mejorar el diseño 
//hacer la parte del mozo 
//poner la púsh para el moso 
//ver requerimientos del p12
//esta:
// punto 12 :
  //esta: el cliente pueden elegir los productos (con sus cantidades) para todos los comensales.
  //erificar que en todo momento esté visible (y con buen tamaño) el importe acumulado
  //Mostrar el tiempo total estimado de realización del pedido completo. 


  continuarPedido(): void {
  const resumen = {
    items: this.carrito.items(),
    total: this.carrito.importeTotal(),
    tiempoEstimado: this.carrito.tiempoTotalEstimado()
  };
  }


  async solicitarPedido(): Promise<void> {
    try {
      // TODO: reemplazar por los ids reales cuando el compañero defina cómo se obtiene la mesa
      const idMesaPrueba = 'b63469cd-404d-460c-a193-4eb153b9dec1';
      const idUsuarioPrueba = '4509335d-09e8-4ec5-984e-20b269a5493f';
      const detalles = ''
      const idPedido = await this.pedido.crear_pedido(idMesaPrueba, idUsuarioPrueba , detalles);
      console.log('Pedido creado con id:', idPedido);
    } catch (error) {
      console.error('Error al crear el pedido:', error);
    }
  }

  volver(){
    this.root.navigate(["/carta/plato"])
  }
}
