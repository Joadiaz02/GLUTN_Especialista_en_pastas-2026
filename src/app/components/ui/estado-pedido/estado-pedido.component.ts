import { Component, Input, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { ModalController, IonButton } from '@ionic/angular';
import { SupabaseService } from '../../../services/supabase.service';
import { RealtimeChannel } from '@supabase/supabase-js';

const ESTADOS_LEGIBLES: Record<string, string> = {
  pendiente: 'Esperando confirmación del mozo',
  confirmado: 'Confirmado',
  rechazado: 'Rechazado, revisá tu pedido',
  en_preparacion: 'Preparando tu pedido',
  listo: 'Tu pedido está listo',
  entregado: 'Pedido entregado'
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

  estado = signal<string>('pendiente');

  estadoLegible = () => ESTADOS_LEGIBLES[this.estado()] ?? this.estado();

  async ngOnInit(): Promise<void> {
   
    const { data } = await this.supabaseService.client
      .from('pedido')
      .select('estado_pedido')
      .eq('id_pedido', this.idPedido)
      .single();

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

  ngOnDestroy(): void {
  
    this.canal?.unsubscribe();
  }

  volver(): void {
    this.modalController.dismiss();
  }
}