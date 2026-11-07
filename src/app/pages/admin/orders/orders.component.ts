import {
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
  computed,
  ViewChild,
  ViewChildren,
  ElementRef,
  QueryList,
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
// Navegación horizontal: mesas
indiceMesaActual = signal<number>(0);

@ViewChild('viewport')
viewport!: ElementRef<HTMLDivElement>;

// Navegación vertical: pedidos de cada mesa
indicePedidoActual = signal<number>(0);

@ViewChildren('mesaViewport')
mesaViewports!: QueryList<ElementRef<HTMLDivElement>>;

// Agrupa los pedidos por mesa, respetando el orden en que llegan.
mesasAgrupadas = computed(() => {
  const grupos = new Map<string, {
    idMesa: string;
    numeroMesa: string;
    pedidos: any[];
  }>();

  for (const pedido of this.pedidos()) {
    const idMesa = String(
      pedido.id_mesa ??
      pedido.mesas?.id ??
      pedido.mesas?.numero ??
      'sin-mesa'
    );

    const numeroMesa = String(pedido.mesas?.numero ?? 'Sin número');

    if (!grupos.has(idMesa)) {
      grupos.set(idMesa, {
        idMesa,
        numeroMesa,
        pedidos: [],
      });
    }

    grupos.get(idMesa)!.pedidos.push(pedido);
  }

  return Array.from(grupos.values());
});

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

const mesas = this.mesasAgrupadas();

const ultimaMesa = Math.max(0, mesas.length - 1);

if (this.indiceMesaActual() > ultimaMesa) {
  this.indiceMesaActual.set(ultimaMesa);
}

const mesaActual = mesas[this.indiceMesaActual()];
const ultimoPedido = Math.max(0, (mesaActual?.pedidos.length ?? 1) - 1);

if (this.indicePedidoActual() > ultimoPedido) {
  this.indicePedidoActual.set(ultimoPedido);
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
  // Navegación horizontal entre mesas
irAMesa(indice: number): void {
  const mesas = this.mesasAgrupadas();

  if (indice < 0 || indice >= mesas.length) return;

  this.indiceMesaActual.set(indice);
  this.indicePedidoActual.set(0);

  const elemento = this.viewport.nativeElement.children[indice] as HTMLElement;

  elemento?.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'center',
  });
}

alDesplazarMesas(): void {
  const el = this.viewport.nativeElement;
  const mesas = Array.from(el.children) as HTMLElement[];

  const centroViewport = el.getBoundingClientRect().left + el.clientWidth / 2;

  let indiceMasCercano = 0;
  let distanciaMinima = Infinity;

  mesas.forEach((mesa, indice) => {
    const rect = mesa.getBoundingClientRect();
    const centroMesa = rect.left + rect.width / 2;
    const distancia = Math.abs(centroMesa - centroViewport);

    if (distancia < distanciaMinima) {
      distanciaMinima = distancia;
      indiceMasCercano = indice;
    }
  });

  if (indiceMasCercano !== this.indiceMesaActual()) {
    this.indiceMesaActual.set(indiceMasCercano);
    this.indicePedidoActual.set(0);
  }
}

// Navegación vertical entre pedidos de la mesa actual
irAPedido(indice: number): void {
  const mesa = this.mesasAgrupadas()[this.indiceMesaActual()];

  if (!mesa || indice < 0 || indice >= mesa.pedidos.length) return;

  this.indicePedidoActual.set(indice);

  const viewport = this.mesaViewports.get(this.indiceMesaActual())?.nativeElement;
  const pedido = viewport?.children[indice] as HTMLElement | undefined;

  pedido?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'nearest',
  });
}

alDesplazarPedidos(event: Event, indiceMesa: number): void {
  // Solo actualizamos el contador de la mesa que está seleccionada.
  if (indiceMesa !== this.indiceMesaActual()) return;

  const el = event.currentTarget as HTMLElement;
  const pedidos = Array.from(el.children) as HTMLElement[];

  const centroViewport = el.getBoundingClientRect().top + el.clientHeight / 2;

  let indiceMasCercano = 0;
  let distanciaMinima = Infinity;

  pedidos.forEach((pedido, indice) => {
    const rect = pedido.getBoundingClientRect();
    const centroPedido = rect.top + rect.height / 2;
    const distancia = Math.abs(centroPedido - centroViewport);

    if (distancia < distanciaMinima) {
      distanciaMinima = distancia;
      indiceMasCercano = indice;
    }
  });

  this.indicePedidoActual.set(indiceMasCercano);
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