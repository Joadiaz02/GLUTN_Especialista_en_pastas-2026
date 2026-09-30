import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton } from '@ionic/angular';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Pedido } from '@app/services/pedido/pedido';
import { TipoCarta } from '@app/models/carta.model';
import { ConfirmDialogComponent } from '@app/components/ui/confirm-cartel/confirm-cartel.component';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { Auth  } from '@app/services';


@Component({
  selector: 'app-sector-pedidos',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, CurrencyPipe, DatePipe, ConfirmDialogComponent, IonButtons, ConfirmVolverComponent, IonButton],
  templateUrl: './sector-pedidos.page.html',
  styleUrl: './sector-pedidos.page.scss'
})
export class SectorPedidosPage implements OnInit {
  private route = inject(ActivatedRoute);
  private pedidoService = inject(Pedido);
  private ruta = inject(Router)
  private auth = inject(Auth)
  titulo = signal('Pedidos');
  tiposPermitidos = signal<TipoCarta[]>([]);
  pedidos = signal<any[]>([]);


  pedidosFiltrados = computed(() =>
    this.pedidos()
      .map(pedido => ({
        ...pedido,
        pedido_item: pedido.pedido_item.filter((item: any) =>
          this.tiposPermitidos().includes(item.carta.tipo)
        )
      }))
      .filter(pedido => pedido.pedido_item.length > 0)  
  );

  async ngOnInit(): Promise<void> {
    this.titulo.set(this.route.snapshot.data['titulo'] ?? 'Pedidos');
    this.tiposPermitidos.set(this.route.snapshot.data['tipos'] ?? []);

    const pedidos = await this.pedidoService.obtenerPedidosConfirmados();
    this.pedidos.set(pedidos);
  }

    volver(): void {
    console.log('qwe');
    void this.ruta.navigate(['/admin']);
  }

  async cerrarSesion(): Promise<void> {
    localStorage.removeItem('token');
    localStorage.removeItem('mesa');

    await this.auth.logout();
    await this.ruta.navigate(['/login']);
  }
}