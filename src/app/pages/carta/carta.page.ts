import { Component, inject } from '@angular/core';
import {
  IonContent,
  IonButton,
  ToastController,
} from '@ionic/angular';
import { Router } from '@angular/router';
import { TipoCarta } from '../../models/carta.model';
import { BarraPedidoComponent } from '@app/components/ui/barra-pedido/barra-pedido.component';
import { Carrito } from '../carrito/carrito';
import { Auth } from '@app/services';
import { HeaderComponent } from '@app/components/ui/header/header.component';

@Component({
  selector: 'app-carta',
  standalone: true,
  templateUrl: './carta.page.html',
  styleUrls: ['./carta.page.scss'],
  imports: [
    HeaderComponent,
    IonContent,
    IonButton,
    BarraPedidoComponent,
  ],
})
export class CartaPage {
  private router = inject(Router);

  public carrito = inject(Carrito);
  private authService = inject(Auth);
  private toastController = inject(ToastController);

  irA(tipo: TipoCarta): void {
    this.router.navigate(['/carta', tipo]);
  }

  irALogin(): void {
    this.router.navigate(['/login']);
  }

  volver() {
    this.router.navigate(['/home']);
  }

  async cerrarSesion(): Promise<void> {
    await this.authService.logout();

    localStorage.removeItem('mesa');

    const toast = await this.toastController.create({
      message: 'Sesión cerrada correctamente.',
      duration: 3000,
      position: 'top',
      color: 'success',
    });
    await toast.present();

    void this.router.navigate(['/login']);
  }
}
