import { Component, inject, OnInit, signal } from '@angular/core';
import { Pedido } from '@app/services/pedido/pedido';
import { Carrito } from '../carrito/carrito';
import { IonHeader, IonToolbar, IonButtons, IonBackButton, IonContent, IonSearchbar, IonButton, ToastController, IonFooter, IonSpinner } from '@ionic/angular';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { Router } from '@angular/router';
import { ConfirmDialogComponent } from '@app/components/ui/confirm-cartel/confirm-cartel.component';
import { CurrencyPipe } from '@angular/common';
import { Auth } from '@app/services';


@Component({
  selector: 'app-pedido',
  templateUrl: './pedido.component.html',
  styleUrls: ['./pedido.component.scss'],
  imports: [IonHeader, IonToolbar, IonButtons, IonContent, ConfirmVolverComponent, ConfirmDialogComponent, CurrencyPipe, IonButton, IonFooter],
})
export class PedidoComponent  {
 
  pedido = inject(Pedido);
  carrito = inject(Carrito);
  root = inject(Router);
  private authService = inject(Auth);
  private toastController = inject(ToastController);
  


  continuarPedido(): void {
  const resumen = {
    items: this.carrito.items(),
    total: this.carrito.importeTotal(),
    tiempoEstimado: this.carrito.tiempoTotalEstimado()
  };
  }


  async solicitarPedido(): Promise<void> {
    try {
      
      const idMesaPrueba = 'b63469cd-404d-460c-a193-4eb153b9dec1';
      const idUsuarioPrueba = '4509335d-09e8-4ec5-984e-20b269a5493f';
      const detalles = ''
      const idPedido = await this.pedido.crear_pedido(idMesaPrueba, idUsuarioPrueba , detalles);
      console.log('Pedido creado con id:', idPedido);
      
      this.root.navigate(['/home']);
    } catch (error) {
      console.error('Error al crear el pedido:', error);
     
    }
  }

  volver(){
    this.root.navigate(["/carta"])
    
  }

  async cerrarSesion(): Promise<void> {
    await this.authService.logout();

    
    localStorage.removeItem('mesa');

    const toast = await this.toastController.create({
      message: 'Sesión cerrada correctamente.',
      duration: 3000,
      position: 'top',
      color: 'success'
    });
    await toast.present();

    void this.root.navigate(['/login']);
    
  }
}
