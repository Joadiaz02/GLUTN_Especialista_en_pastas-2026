import { ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { IonHeader, IonToolbar, IonButtons, IonTitle, IonContent } from '@ionic/angular';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { ConfirmDialogComponent } from '@app/components/ui/confirm-cartel/confirm-cartel.component';
import { Auth } from '@app/services';
import { Router } from '@angular/router';
import { logOutOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { Pedido } from '@app/services/pedido/pedido';
import { Carrito } from '@app/pages/carrito/carrito';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss'],
  imports: [IonHeader, IonToolbar, IonButtons, ConfirmVolverComponent, ConfirmDialogComponent, IonTitle, IonContent],
})
export class OrdersComponent {
  pedido = inject(Pedido);
  carrito = inject(Carrito);
  root = inject(Router);

  pedidos = signal<any[]>([]);
  cargando = signal(false);
  constructor(
    private auth: Auth,
    private router: Router,
    private cdr: ChangeDetectorRef,
    
    
  ) {
    addIcons({
    'log-out-outline': logOutOutline
  });

  }


  async ngOnInit(): Promise<void> {
    this.cargando.set(true);
    const pedidos = await this.pedido.traer_pedido();
    this.pedidos.set(pedidos);
    this.cargando.set(false);
  }

    volver(): void {
    console.log("qwe")
    void this.router.navigate(['/admin']);
  }


  async cerrarSesion(): Promise<void> {
    localStorage.removeItem('token');
    localStorage.removeItem('mesa');

    await this.auth.logout();
    await this.router.navigate(['/login']);
  }
}
