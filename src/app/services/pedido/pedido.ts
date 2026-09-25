import {  inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { Carrito } from '@app/pages/carrito/carrito';

@Injectable({
    providedIn: 'root'
})
export class Pedido {
    private sup = inject(SupabaseService);
    private carrito = inject(Carrito);
    public estado_pedido = signal<boolean>(false);
    public idUltimoPedido = signal<string | null>(null);
    public idPedidoEnEdicion = signal<string | null>(null);

    async crear_pedido(id_mesa:string,id_usuario:string , detalles:string  ) : Promise<string> {
        const item = this.carrito.items();

        if (item.length === 0) {
            throw new Error('El carrito está vacío');
        }
        const {data:pedido , error: error} = await this.sup.client.from('pedido').insert({
            id_mesa: id_mesa,
            id_usuario:id_usuario,
            detalles,
            subtotal:this.carrito.importeTotal(),
            estado_pedido:'pendiente'
        }).select().single();

        if (error) {
            throw error;
        }

        const itemsAInsertar = item.map(item => ({
        id_pedido: pedido.id_pedido,
        id_carta: item.producto.id_carta,
        cantidad: item.cantidad,
        precio_unitario: item.producto.precio,
        subtotal: item.producto.precio * item.cantidad
        }));

        const {error: error_items} = await this.sup.client.from('pedido_item').insert(itemsAInsertar)

        if(error_items){
            throw error_items;
        };

        const { data: dataNotif, error: errorNotif } = await this.sup.client.functions.invoke('notify-new-pedido', {
            body: { idPedido: pedido.id_pedido, idMesa: id_mesa }
        });

        alert('Notif data: ' + JSON.stringify(dataNotif) + ' | error: ' + JSON.stringify(errorNotif));
        this.carrito.vaciar();
        this.estado_pedido.set(true);
        this.idUltimoPedido.set(pedido.id_pedido)
        return pedido.id_pedido;
    }

    async traer_pedido( ): Promise<any[]> {

        const { data, error } = await this.sup.client.from('pedido').select('*').eq('estado_pedido', 'pendiente').order('fecha_emision_pedido', { ascending: true });

        if (error) {
            throw error;   
        }
        if (!data) {
            throw new Error('Pedido no encontrado');
        }    
        
        return data ?? [];

                
    }

    async obtenerPedidoConItems(idPedido: string): Promise<any> {
    const { data: pedido, error: errorPedido } = await this.sup.client.from('pedido').select('*').eq('id_pedido', idPedido).single();

    if (errorPedido) throw errorPedido;

    const { data: items, error: errorItems } = await this.sup.client.from('pedido_item').select('*, carta(*)').eq('id_pedido', idPedido );

    if (errorItems) {
        throw errorItems
    };

    return { ...pedido, items: items ?? [] };
  }

    async actualizarEstado(idPedido: string,idUsuario: string ,nuevoEstado: string): Promise<void> {
    const { error } = await this.sup.client
      .from('pedido')
      .update({ estado_pedido: nuevoEstado })
      .eq('id_pedido', idPedido);

    if (error) throw error;

    await this.sup.client.functions.invoke('notify-order-status', {
    body: {idUsuario , idPedido, nuevoEstado }
  });
  }

  async actualizar_pedido(id_pedido:string):Promise<void>{
    const items = this.carrito.items();

        if (items.length === 0) {
        throw new Error('El carrito está vacío');
    }

    const { error: errorBorrar } = await this.sup.client.from('pedido_item').delete().eq('id_pedido', id_pedido);

    if (errorBorrar) throw errorBorrar;

        const itemsAInsertar = items.map(item => ({
        id_pedido: id_pedido,
        id_carta: item.producto.id_carta,
        cantidad: item.cantidad,
        precio_unitario: item.producto.precio,
        subtotal: item.producto.precio * item.cantidad
        }));

        const {error: error_items} = await this.sup.client.from('pedido_item').insert(itemsAInsertar)

        if(error_items){
            throw error_items;
        };

        const {error:error_modificacion} = await this.sup.client.from('pedido').update({subtotal:this.carrito.importeTotal(),estado_pedido:'pendiente'}).eq('id_pedido',id_pedido)
        
        if (error_modificacion) throw error_modificacion;
        this.carrito.vaciar();
        this.idPedidoEnEdicion.set(null);
    }

}


       

  