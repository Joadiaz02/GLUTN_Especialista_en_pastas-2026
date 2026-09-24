import {
  Injectable,
  signal,
  computed,
} from '@angular/core';

import { CartaItem } from '../../models/carta.model';


export interface ItemCarrito {
  producto: CartaItem;
  cantidad: number;
}


@Injectable({
  providedIn: 'root',
})
export class Carrito {

  private _items =
    signal<Record<string, ItemCarrito>>({});


  /* ==========================================
     CANTIDAD
  ========================================== */

  cantidadDe(
    idProducto: string
  ): number {

    return (
      this._items()[idProducto]?.cantidad
      ?? 0
    );

  }


  /* ==========================================
     AGREGAR
  ========================================== */

  agregar(
    producto: CartaItem
  ): void {

    this._items.update(actual => {

      const existente =
        actual[producto.id_carta];

      return {

        ...actual,

        [producto.id_carta]: {

          producto,

          cantidad:
            (existente?.cantidad ?? 0) + 1,

        },

      };

    });

  }


  /* ==========================================
     QUITAR UNA UNIDAD
  ========================================== */

  quitar(
    idProducto: string
  ): void {

    this._items.update(actual => {

      const existente =
        actual[idProducto];

      if (!existente) {
        return actual;
      }


      if (existente.cantidad <= 1) {

        const {
          [idProducto]: _,
          ...resto
        } = actual;

        return resto;

      }


      return {

        ...actual,

        [idProducto]: {

          ...existente,

          cantidad:
            existente.cantidad - 1,

        },

      };

    });

  }


  /* ==========================================
     ELIMINAR PRODUCTO COMPLETO
  ========================================== */

  eliminar(
    idProducto: string
  ): void {

    this._items.update(actual => {

      const {
        [idProducto]: _,
        ...resto
      } = actual;

      return resto;

    });

  }


  /* ==========================================
     VACIAR
  ========================================== */

  vaciar(): void {

    this._items.set({});

  }


  /* ==========================================
     TOTAL DE UNIDADES
  ========================================== */

  totalItems = computed(() =>

    Object.values(this._items())
      .reduce(
        (total, item) =>
          total + item.cantidad,
        0
      )

  );


  /* ==========================================
     TOTAL DINERO
  ========================================== */

  importeTotal = computed(() =>

    Object.values(this._items())
      .reduce(
        (total, item) =>
          total +
          item.producto.precio *
          item.cantidad,

        0
      )

  );


  /* ==========================================
     TIEMPO MÁXIMO
     
     NO SUMA LOS TIEMPOS.
     
     Ej:
     25 + 40 + 15

     Resultado:
     40
  ========================================== */

  tiempoTotalEstimado = computed(() => {

    const items =
      Object.values(this._items());

    if (items.length === 0) {
      return 0;
    }

    return Math.max(
      ...items.map(
        item =>
          item.producto
            .tiempo_elaboracion
      )
    );

  });


  /* ==========================================
     ITEMS
  ========================================== */

  items = computed(() =>
    Object.values(this._items())
  );


  /* ==========================================
     CARGAR CARRITO
  ========================================== */

  cargar(
    items: {
      producto: CartaItem;
      cantidad: number;
    }[]
  ): void {

    const nuevoCarrito:
      Record<string, ItemCarrito> = {};


    for (const item of items) {

      nuevoCarrito[
        item.producto.id_carta
      ] = {

        producto:
          item.producto,

        cantidad:
          item.cantidad,

      };

    }


    this._items.set(nuevoCarrito);

  }

}