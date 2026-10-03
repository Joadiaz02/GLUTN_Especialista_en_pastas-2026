import {
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  signal,
  ViewChild,
  ElementRef,
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

  pedidoService = inject(Pedido); // Renombrado para evitar conflicto con la variable tipada si existiera
  carrito = inject(Carrito);
  estado = signal<string | null>(null);
  pedidos = signal<any[]>([]);
  cargando = signal(false);

  // Variables y señales para el carrusel de tarjetas
  indiceActual = signal<number>(0);
  @ViewChild('viewport') viewport!: ElementRef<HTMLDivElement>;

  constructor() {
    addIcons({
      'log-out-outline': logOutOutline,
    });
  }

  async cargarpedido() {
    this.cargando.set(true);
    const listaPedidos = await this.pedidoService.traer_pedido();

    // Consultamos los detalles/items para cada pedido en paralelo usando la lógica de obtenerPedidoConItems
    const pedidosConDetalle = await Promise.all(
      listaPedidos.map(async (p: any) => {
        try {
          const detalle = await this.pedidoService.obtenerPedidoConItems(p.id_pedido);
          return { ...p, ...detalle };
        } catch (e) {
          return p;
        }
      })
    );

    this.pedidos.set(pedidosConDetalle);
    this.cargando.set(false);
  }

  async confirmar(idPedido: string): Promise<void> {
    const pedidoActual = this.pedidos().find(p => p.id_pedido === idPedido);
    if (!pedidoActual) return;
    this.estado.set(idPedido);
    await this.pedidoService.actualizarEstado(idPedido, pedidoActual.id_usuario, 'confirmado');
    await this.cargarpedido();
    this.estado.set(null);
  }

  async rechazar(idPedido: string): Promise<void> {
    const pedidoActual = this.pedidos().find(p => p.id_pedido === idPedido);
    if (!pedidoActual) return;
    this.estado.set(idPedido);
    await this.pedidoService.actualizarEstado(idPedido, pedidoActual.id_usuario, 'rechazado');
    await this.cargarpedido();
    this.estado.set(null);
  }

  async ngOnInit(): Promise<void> {
    await this.cargarpedido();
  }

  volver(): void {
    void this.router.navigate(['/admin']);
  }

  async cerrarSesion(): Promise<void> {
    localStorage.removeItem('token');
    localStorage.removeItem('mesa');

    await this.auth.logout();
    await this.router.navigate(['/login']);
  }

  // Métodos para mover el carrusel de tarjetas y calcular el scroll
  irA(indice: number) {
    this.indiceActual.set(indice);
    const el = this.viewport.nativeElement;
    const slide = el.children[indice] as HTMLElement;
    if (slide) {
      slide.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  alDesplazar() {
    const el = this.viewport.nativeElement;
    const children = Array.from(el.children) as HTMLElement[];
    const scrollLeft = el.scrollLeft;
    
    let closestIndex = 0;
    let minDistance = Infinity;

    children.forEach((slide, index) => {
      const distance = Math.abs(slide.offsetLeft - scrollLeft - (el.clientWidth - slide.clientWidth) / 2);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    if (closestIndex !== this.indiceActual()) {
      this.indiceActual.set(closestIndex);
    }
  }
}