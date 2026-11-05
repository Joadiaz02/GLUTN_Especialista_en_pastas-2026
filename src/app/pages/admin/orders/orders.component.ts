import {
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  signal,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { IonHeader, IonToolbar, IonButtons, IonTitle, IonContent, IonButton, IonRouterLink, ToastController, IonIcon } from '@ionic/angular';
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
import { ListaFilasDirective } from '@app/directives/lista-filas/lista-filas.directive';
import { RealtimeChannel } from '@supabase/supabase-js';
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
    SpinnerLogoComponent,
    ListaFilasDirective,
    IonIcon
],
})
export class OrdersComponent implements OnInit {
  private auth = inject(Auth);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private toastController = inject(ToastController);

  pedidoService = inject(Pedido); // Renombrado para evitar conflicto con la variable tipada si existiera
  carrito = inject(Carrito);
  estado = signal<string | null>(null);
  pedidos = signal<any[]>([]);
  cargando = signal(false);

  // Variables y señales para el carrusel de tarjetas
  indiceActual = signal<number>(0);
  @ViewChild('viewport') viewport!: ElementRef<HTMLDivElement>;

  private canalPedidos: RealtimeChannel | null = null;
private temporizadorRecarga: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    addIcons({
      'log-out-outline': logOutOutline,
    });
  }

  async cargarpedido(silencioso = false) {
  if (!silencioso) this.cargando.set(true);

  try {
    const listaPedidos = await this.pedidoService.traer_pedido();

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

    const ultimo = Math.max(0, pedidosConDetalle.length - 1);
    if (this.indiceActual() > ultimo) {
      this.indiceActual.set(ultimo);
    }
  } catch (error) {
    console.error('Error al cargar los pedidos:', error);
  } finally {
    if (!silencioso) this.cargando.set(false);
  }
}

  estadoPedidoCarga = signal(false)

  async confirmar(idPedido: string): Promise<void> {
    const pedidoActual = this.pedidos().find(p => p.id_pedido === idPedido);
    if (!pedidoActual) return;
    this.estado.set(idPedido);
    try{
      this.estadoPedidoCarga.set(true)

      await this.pedidoService.actualizarEstado(idPedido, pedidoActual.id_usuario, 'confirmado');
      this.mostrarToast('Pedido confirmado con éxito y derivado a Cocina / Bar.', 'success');

      await this.cargarpedido();
    
    }catch (error){
      console.error('Error al confirmar el pedido:', error);
      this.mostrarToast('No se pudo confirmar el pedido. Intentá de nuevo.', 'danger');
    }finally {
    this.estadoPedidoCarga.set(false)
    this.estado.set(null);
    }
  }

  private async mostrarToast(message: string, color: string): Promise<void> {
  const toast = await this.toastController.create({ 
    message, 
    duration: 3000, 
    position: 'top', 
    color 
  });
  await toast.present();
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

  this.canalPedidos = this.pedidoService.suscribirCambiosPedidos(() => this.programarRecarga());
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

  ngOnDestroy(): void {
  if (this.temporizadorRecarga) clearTimeout(this.temporizadorRecarga);
  if (this.canalPedidos) void this.pedidoService.cancelarSuscripcion(this.canalPedidos);
}

// junta varios eventos seguidos (pedido + items) en una sola recarga
private programarRecarga(): void {
  if (this.temporizadorRecarga) clearTimeout(this.temporizadorRecarga);
  this.temporizadorRecarga = setTimeout(() => {
    void this.cargarpedido(true);
  }, 400);
}
}