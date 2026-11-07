import { Component, computed, inject, signal } from '@angular/core';
import { ModalController, IonButton, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Pedido } from '@app/services/pedido/pedido';
import { Carrito } from '@app/pages/carrito/carrito';
import { Vibracion } from '@app/services';
import { LimitesListaDirective } from '@app/directives/limites-lista.directive';
import { CommonModule, CurrencyPipe } from '@angular/common';

const estados_posibles: Record<string, string> = {
  pendiente: 'Esperando confirmación del mozo',
  confirmado: 'Confirmado',
  rechazado: 'Rechazado, revisá tu pedido',
  en_preparacion: 'Preparando tu pedido',
  listo: 'Tu pedido está listo',
  entregado: 'Pedido entregado',
  recibido: 'Pedido recibido, ¡buen provecho!',
  cuenta_solicitada: 'Cuenta solicitada, el mozo te la lleva enseguida',
  cuenta_entregada: 'Tu cuenta está lista',
  pago_realizado: 'Pago enviado, esperando la confirmación del mozo',
  pagado: 'Pago confirmado. ¡Gracias por tu visita!',
};

const ESTADOS_EN_CURSO = [
  'pendiente',
  'confirmado',
  'en_preparacion',
  'listo',
  'entregado',
];

@Component({
  selector: 'app-estado-pedido',
  standalone: true,
  templateUrl: './estado-pedido.component.html',
  styleUrls: ['./estado-pedido.component.scss'],
  imports: [CommonModule, CurrencyPipe, IonButton, LimitesListaDirective],
})
export class EstadoPedidoComponent {
  private modalController = inject(ModalController);
  private router = inject(Router);
  private carrito = inject(Carrito);
  private toastController = inject(ToastController);
  private vibracion = inject(Vibracion);

  public pedidoService = inject(Pedido);

  // id del pedido que se está confirmando (null si ninguno)
  confirmando = signal<string | null>(null);

  // La lista se mantiene actualizada desde el home (realtime).
  pedidos = this.pedidoService.pedidosActivos;

  legible = (estado: string) => estados_posibles[estado] ?? estado;

  total = computed(() =>
  this.pedidos().reduce((acc, pedido) => acc + pedido.subtotal, 0)
);

  ngOnInit() {
    console.log(this.pedidos())
  }

  // Se puede pedir la cuenta solo si todos los pedidos (menos los
  // rechazados) están recibidos.
  puedeSolicitarCuenta = computed(() => {
    const validos = this.pedidos().filter(
      (p) => p.estado_pedido !== 'rechazado'
    );

    return (
      validos.length > 0 &&
      validos.every((p) => p.estado_pedido === 'recibido')
    );
  });

  hayPendientes = computed(() => this.pedidos().some((p) => ESTADOS_EN_CURSO.includes(p.estado_pedido)));

  hayCuentaEntregada = computed(() =>
    this.pedidos().some((p) => p.estado_pedido === 'cuenta_entregada')
  );

  async modificar(idPedido: string): Promise<void> {
    const pedidoCompleto =
      await this.pedidoService.obtenerPedidoConItems(idPedido);

    const itemsParaCarrito = pedidoCompleto.items.map((item: any) => ({
      producto: item.carta,
      cantidad: item.cantidad,
    }));

    this.carrito.cargar(itemsParaCarrito);

    this.pedidoService.idPedidoEnEdicion.set(idPedido);

    await this.modalController.dismiss();

    await this.router.navigate(['/carta']);
  }

  async confirmarRecepcion(idPedido: string): Promise<void> {
    if (this.confirmando()) return;

    this.confirmando.set(idPedido);

    try {
      // confirmarRecepcion ya recarga la lista de pedidos activos
      await this.pedidoService.confirmarRecepcion(idPedido);
    } catch (error) {
      void this.vibracion.error();

      const toast = await this.toastController.create({
        message: 'No pudimos confirmar la recepción. Intentá de nuevo.',
        duration: 3000,
        position: 'top',
        color: 'danger',
      });

      await toast.present();
    } finally {
      this.confirmando.set(null);
    }
  }

  solicitarCuenta(): void {
    void this.modalController.dismiss(null, 'solicitar-cuenta');
  }

  async verCuenta(): Promise<void> {
    await this.modalController.dismiss();

    await this.router.navigate(['/cuenta']);
  }

  volver(): void {
    void this.modalController.dismiss();
  }
}