import { Component, Input, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { ModalController, IonButton, ToastController } from '@ionic/angular';
import { SupabaseService } from '../../../services/supabase.service';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Pedido } from '@app/services/pedido/pedido';
import { Router } from '@angular/router';
import { Carrito } from '@app/pages/carrito/carrito';
import { Vibracion } from '@app/services';

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
  pagado: 'Pago confirmado. ¡Gracias por tu visita!'
};

@Component({
  selector: 'app-estado-pedido',
  templateUrl: './estado-pedido.component.html',
  styleUrls: ['./estado-pedido.component.scss'],
  imports: [IonButton],
})
export class EstadoPedidoComponent implements OnInit, OnDestroy {
  @Input({ required: true }) idPedido!: string;

  private supabaseService = inject(SupabaseService);
  private modalController = inject(ModalController);
  private canal!: RealtimeChannel;
  public pedidoService = inject(Pedido);
  private router = inject(Router);
  private carrito = inject(Carrito);

  //punto19
  private toastController = inject(ToastController);
  private vibracion = inject(Vibracion);

  confirmando = signal(false);

  estado = signal<string>('pendiente');

  estadoLegible = () => estados_posibles[this.estado()] ?? this.estado();

  async ngOnInit(): Promise<void> {
   
    const { data } = await this.supabaseService.client.from('pedido').select('estado_pedido').eq('id_pedido', this.idPedido).single();

    if (data) {
      this.estado.set(data.estado_pedido);
    }

    
    this.canal = this.supabaseService.client
      .channel(`pedido-estado-${this.idPedido}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pedido',
          filter: `id_pedido=eq.${this.idPedido}`
        },
        (payload) => {
          this.estado.set(payload.new['estado_pedido']);
        }
      )
      .subscribe();

  }

  async modificar(): Promise<void>{
        const pedidoCompleto = await this.pedidoService.obtenerPedidoConItems(this.idPedido);

        const itemsParaCarrito = pedidoCompleto.items.map((item: any) => ({
          producto: item.carta,
          cantidad: item.cantidad
        }));

        this.carrito.cargar(itemsParaCarrito);
        this.pedidoService.idPedidoEnEdicion.set(this.idPedido);

        this.modalController.dismiss();
        this.router.navigate(['/carta']);
      }

    //logica de confirmar 
    async confirmarRecepcion(): Promise<void> {
      if (this.confirmando()) return;

      this.confirmando.set(true);

      try {
        await this.pedidoService.confirmarRecepcion(this.idPedido);
        this.estado.set('recibido');
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
        this.confirmando.set(false);
      }
    }

  ngOnDestroy(): void {
    if (this.canal) {
      void this.supabaseService.client.removeChannel(this.canal);
    }
  }

  //punto 21
  solicitarCuenta(): void {
    void this.modalController.dismiss('solicitar-cuenta');
  }
  verCuenta(): void {
      void this.modalController.dismiss();
      void this.router.navigate(['/cuenta']);
    }

  volver(): void {
    this.modalController.dismiss();
  }
}