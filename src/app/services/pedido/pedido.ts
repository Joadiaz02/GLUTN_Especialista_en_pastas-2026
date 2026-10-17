import {  effect, inject, Injectable, signal, untracked } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { Carrito } from '@app/pages/carrito/carrito';
import { MesaCliente } from '../mesa-cliente/mesa-cliente';

@Injectable({
    providedIn: 'root'
})
export class Pedido {
    private sup = inject(SupabaseService);
    private carrito = inject(Carrito);
    public estado_pedido = signal<boolean>(false);
    public idUltimoPedido = signal<string | null>(null);
    public idPedidoEnEdicion = signal<string | null>(null);
    private mesaCliente = inject(MesaCliente);

    constructor() {
        // al entrar o cambiar de mesa recupera el pedido de la estadía
        effect(() => {
            const idMesa = this.mesaCliente.id();
            const desde = this.mesaCliente.desde();
            untracked(() => void this.recuperarPedidoActual(idMesa, desde));
        });
    }

    // último pedido del cliente en su mesa desde que se anotó
    private async recuperarPedidoActual(idMesa: string | null, desde: string | null): Promise<void> {
        if (!idMesa || !desde) {
            this.idUltimoPedido.set(null);
            return;
        }

        const { data: sesion } = await this.sup.client.auth.getSession();
        const idUsuario = sesion.session?.user.id;

        if (!idUsuario) return;

        const { data, error } = await this.sup.client
            .from('pedido')
            .select('id_pedido')
            .eq('id_usuario', idUsuario)
            .eq('id_mesa', idMesa)
            .gte('fecha_emision_pedido', desde)
            .order('fecha_emision_pedido', { ascending: false })
            .limit(1)
            .maybeSingle();

        // descarta la respuesta si mientras tanto cambió la mesa
        if (error || this.mesaCliente.id() !== idMesa) return;

        if (data?.id_pedido) {
            this.idUltimoPedido.set(data.id_pedido);
        }
    }

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
            estado_pedido:'Pendiente'
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
            // borra el pedido sin productos para que no le llegue vacío al mozo
            await this.sup.client.from('pedido').delete().eq('id_pedido', pedido.id_pedido);
            throw error_items;
        };

        // el pedido ya quedó guardado aunque falle el aviso al mozo
         this.sup.client.functions.invoke('notify-new-pedido', {
            body: { idPedido: pedido.id_pedido, idMesa: id_mesa }
        }).then(({error:errorAviso})=>{
          if (errorAviso) {
            console.log('No se pudo avisar al mozo del pedido nuevo:', errorAviso)
          }
          
        });

        

        
        this.carrito.vaciar();
        this.estado_pedido.set(true);
        this.idUltimoPedido.set(pedido.id_pedido)
        return pedido.id_pedido;
    }

    async traer_pedido( ): Promise<any[]> {

        const { data, error } = await this.sup.client.from('pedido').select('*').eq('estado_pedido', 'Pendiente').order('fecha_emision_pedido', { ascending: true });

        if (error) {
            throw error;   
        }
        if (!data) {
            throw new Error('Pedido no encontrado');
        }    
        
        return data ?? [];

                
    }

    async obtenerPedidoConItems(idPedido: string): Promise<any> {
      const { data: pedido, error: errorPedido } = await this.sup.client
        .from('pedido')
        .select('*, mesas(numero), usuarios:id_usuario(nombre, apellido)')
        .eq('id_pedido', idPedido)
        .single();

      if (errorPedido) throw errorPedido;

      const { data: items, error: errorItems } = await this.sup.client
        .from('pedido_item')
        .select('*, carta(*)')
        .eq('id_pedido', idPedido);

      if (errorItems) throw errorItems;

      return { ...pedido, items: items ?? [] };
    }

    async actualizarEstado(idPedido: string,idUsuario: string ,nuevoEstado: string): Promise<void> {
    const {data: pedidoActualizado , error } = await this.sup.client
      .from('pedido')
      .update({ estado_pedido: nuevoEstado })
      .eq('id_pedido', idPedido)
      .select()
      .single();

    if (error) throw error;
    if (!pedidoActualizado) throw new Error('Pedido no encontrado');

    await this.sup.client.functions.invoke('notify-pedido-stado', {
    body: { idUsuario, idPedido, nuevoEstado }
    });

    if (nuevoEstado === 'confirmado') {
    await this.sup.client.functions.invoke('notify-kitchen-bar', {
      body: { idPedido, idMesa: pedidoActualizado.id_mesa }
      });
    }
  }
  
  

  async actualizar_pedido(id_pedido: string): Promise<void> {
  const items = this.carrito.items();

  if (items.length === 0) {
    throw new Error('El carrito está vacío');
  }

  const { data: borrados, error: errorBorrar } = await this.sup.client.from('pedido_item').delete().eq('id_pedido', id_pedido).select('id_pedido');
  if (errorBorrar) throw errorBorrar;

  // si no se borró nada no sigue, así no se duplican los productos
  if (!borrados || borrados.length === 0) {
    throw new Error('No se pudieron reemplazar los productos del pedido.');
  }

  const itemsAInsertar = items.map(item => ({
    id_pedido: id_pedido,
    id_carta: item.producto.id_carta,
    cantidad: item.cantidad,
    precio_unitario: item.producto.precio,
    subtotal: item.producto.precio * item.cantidad
  }));

  const { error: error_items } = await this.sup.client.from('pedido_item').insert(itemsAInsertar);
  if (error_items) throw error_items;


  const { data: pedidoActualizado, error: error_modificacion } = await this.sup.client
    .from('pedido')
    .update({ subtotal: this.carrito.importeTotal(), estado_pedido: 'Pendiente' })
    .eq('id_pedido', id_pedido)
    .select()
    .single();

  if (error_modificacion) throw error_modificacion;

  await this.sup.client.functions.invoke('notify-new-pedido', {
    body: { idPedido: id_pedido, idMesa: pedidoActualizado.id_mesa }
  });

  this.carrito.vaciar();
  this.idPedidoEnEdicion.set(null);
  // el home sigue el pedido modificado
  this.idUltimoPedido.set(id_pedido);
}

async obtenerPedidosConfirmados(): Promise<any[]> {
  const { data, error } = await this.sup.client
    .from('pedido')
    .select('*, pedido_item(*, carta(*))')
    .eq('estado_pedido', 'confirmado')
    .order('fecha_emision_pedido', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

}


       

  