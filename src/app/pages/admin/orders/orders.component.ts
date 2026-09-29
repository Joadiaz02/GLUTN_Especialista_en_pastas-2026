import {
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonTitle,
  IonContent,
  IonButton,
  IonRouterLink,
} from '@ionic/angular';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { ConfirmDialogComponent } from '@app/components/ui/confirm-cartel/confirm-cartel.component';
import { Auth } from '@app/services';
import { Router, RouterLink } from '@angular/router';
import { logOutOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { Pedido } from '@app/services/pedido/pedido';
import { Carrito } from '@app/pages/carrito/carrito';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    ConfirmVolverComponent,
    ConfirmDialogComponent,
    IonTitle,
    IonContent,
    CommonModule,
    IonButton,
    IonRouterLink,
    RouterLink,
    SpinnerLogoComponent
  ],
})
export class OrdersComponent implements OnInit {
  private auth = inject(Auth);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  pedido = inject(Pedido);
  carrito = inject(Carrito);
  root = inject(Router);
  estado = signal<string | null>(null);
  pedidos = signal<any[]>([]);
  cargando = signal(false);
  constructor() {
    addIcons({
      'log-out-outline': logOutOutline,
    });
  }

  async cargarpedido() {
    this.cargando.set(true);
    const pedidos = await this.pedido.traer_pedido();

    this.pedidos.set(pedidos);
    this.cargando.set(false);
  }

  async confirmar(idPedido: string): Promise<void> {
  const pedidoActual = this.pedidos().find(p => p.id_pedido === idPedido);
  if (!pedidoActual) return;
  this.estado.set(idPedido);
  await this.pedido.actualizarEstado(idPedido, pedidoActual.id_usuario, 'confirmado');
  await this.cargarpedido();
  this.estado.set(null);
}

async rechazar(idPedido: string): Promise<void> {
  const pedidoActual = this.pedidos().find(p => p.id_pedido === idPedido);
  if (!pedidoActual) return;
  this.estado.set(idPedido);
  await this.pedido.actualizarEstado(idPedido, pedidoActual.id_usuario, 'rechazado');
  await this.cargarpedido();
  this.estado.set(null);
}

  async ngOnInit(): Promise<void> {
    await this.cargarpedido();
  }

  volver(): void {
    console.log('qwe');
    void this.router.navigate(['/admin']);
  }

  async cerrarSesion(): Promise<void> {
    localStorage.removeItem('token');
    localStorage.removeItem('mesa');

    await this.auth.logout();
    await this.router.navigate(['/login']);
  }
}
