import {  inject, Injectable } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { Carrito } from '@app/pages/carrito/carrito';

@Injectable({
    providedIn: 'root'
})
export class Pedido {
    private sup = inject(SupabaseService);
    private carrito = inject(Carrito);

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
        this.carrito.vaciar();

        return pedido.id_pedido;
    }
}
    