import { CurrencyPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Auth } from '@app/services';
import { Pedido } from '@app/services/pedido/pedido';
import { addIcons } from 'ionicons';
import { logOutOutline } from 'ionicons/icons';
import { IonButton, IonButtons, IonTitle, IonToolbar, IonHeader, IonContent } from '@ionic/angular';
import { ConfirmDialogComponent } from '@app/components/ui/confirm-cartel/confirm-cartel.component';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';

@Component({
  selector: 'app-orders-detalles',
  templateUrl: './orders-detalles.component.html',
  styleUrls: ['./orders-detalles.component.scss'],
  imports: [CurrencyPipe, IonButton, IonButtons, ConfirmDialogComponent, IonTitle, ConfirmVolverComponent, IonToolbar, IonHeader, IonContent],
})
export class OrdersDetallesComponent implements OnInit {
  private pedidoService = inject(Pedido);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(Auth);

  pedido = signal<any>(null);  
  estado = signal<string | null>(null);

  constructor() {
    addIcons({ 'log-out-outline': logOutOutline });
  }

  async ngOnInit(): Promise<void> {
    const idPedido = this.route.snapshot.paramMap.get('id')!;
    const pedido = await this.pedidoService.obtenerPedidoConItems(idPedido);
    this.pedido.set(pedido);
  }

  volver(): void {
    this.router.navigate(['/admin/orders']);
  }

  async cerrarSesion(): Promise<void> {
    localStorage.removeItem('token');
    localStorage.removeItem('mesa');
    await this.auth.logout();
    await this.router.navigate(['/login']);
  }
}