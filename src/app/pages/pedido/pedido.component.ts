import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { Pedido } from '@app/services/pedido/pedido';
import { Carrito } from '../carrito/carrito';
import { IonHeader, IonToolbar, IonButtons, IonBackButton, IonContent, IonSearchbar, IonButton, ToastController, IonFooter, IonSpinner, IonIcon } from '@ionic/angular';
import { LoadingOverlayComponent } from '@app/components/ui/loading-overlay';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { Router } from '@angular/router';
import { ConfirmDialogComponent } from '@app/components/ui/confirm-cartel/confirm-cartel.component';
import { CurrencyPipe } from '@angular/common';
import { Auth, MesaCliente } from '@app/services';
import { Vibracion } from '@app/services';
import { CartaItem } from '@app/models/carta.model';

@Component({
  selector: 'app-pedido',
  templateUrl: './pedido.component.html',
  styleUrls: ['./pedido.component.scss'],
  imports: [IonHeader, IonToolbar, IonButtons, IonContent, ConfirmVolverComponent, ConfirmDialogComponent,
    CurrencyPipe, IonButton, IonFooter, IonIcon, LoadingOverlayComponent],
})
export class PedidoComponent  {
 
  pedido = inject(Pedido);
  carrito = inject(Carrito);
  root = inject(Router);
  private authService = inject(Auth);
  private toastController = inject(ToastController);
  private vibracion = inject(Vibracion);
  private mesaCliente = inject(MesaCliente);


  continuarPedido() {
    return {
      items: this.carrito.items(),
      total: this.carrito.importeTotal(),
      tiempoEstimado: this.carrito.tiempoTotalEstimado(),
    };
  }


  // evita el doble toque mientras se guarda
  enviando = signal(false);

  // marca que el carrito se vació por el envío, no por el cliente
  private enviado = false;

  async solicitarPedido(): Promise<void> {
    if (this.enviando()) return;

    this.enviando.set(true);

    try {
      const usuario = this.authService.usuarioActual() ?? await this.authService.obtenerUsuarioActual();

      if (!usuario) {
        await this.vibracion.error();
        await this.mostrarToast('Tu sesión expiró. Volvé a ingresar.', 'warning');
        return;
      }

      // vuelve a buscar la mesa por si la asignaron recién
      if (!this.mesaCliente.id()) {
        await this.mesaCliente.actualizar();
      }

      const idMesa = this.mesaCliente.id();

      if (!idMesa) {
        await this.vibracion.error();
        await this.mostrarToast('Todavía no estás en tu mesa. Escaneá el QR de la mesa que te asignó el metre.', 'warning');
        return;
      }

      const idEnEdicion = this.pedido.idPedidoEnEdicion();

      this.enviado = true;

      if (idEnEdicion) {
        await this.pedido.actualizar_pedido(idEnEdicion);
      } else {
        await this.pedido.crear_pedido(idMesa, usuario.id, '');
      }

      await this.vibracion.confirmacion();
      await this.mostrarToast('¡Pedido enviado! El mozo lo va a confirmar en breve.', 'success');

      void this.root.navigate(['/home'], { replaceUrl: true });
    } catch (error) {
      this.enviado = false;
      await this.vibracion.error();
      console.error('Error al confirmar el pedido:', error);
      await this.mostrarToast('No pudimos enviar el pedido. Intentá de nuevo.', 'danger');
    } finally {
      this.enviando.set(false);
    }
  }

  private async mostrarToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 3000, position: 'top', color });
    await toast.present();
  }

  constructor() {
    effect(() => {
      // si el carrito se vació por el envío, la navegación la hace solicitarPedido
      if (this.carrito.totalItems() === 0 && !this.enviado) {
        this.root.navigate(['/carta']);
      }
    });
  }

  agregarProducto(producto: CartaItem): void {
  this.carrito.agregar(producto);
  }

  quitarProducto(producto: CartaItem): void {
    this.carrito.quitar(producto.id_carta);
  }

  eliminarProducto(producto: CartaItem): void {
  this.carrito.eliminar(producto.id_carta);
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
