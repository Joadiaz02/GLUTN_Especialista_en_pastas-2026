import { Injectable, signal, computed } from '@angular/core';
import { CartaItem } from '../../models/carta.model';

interface ItemCarrito {
  producto: CartaItem;
  cantidad: number;
}

@Injectable({ providedIn: 'root' })
export class Carrito {

  private _items = signal<Record<string, ItemCarrito>>({});

  cantidadDe(idProducto: string): number {
    return this._items()[idProducto]?.cantidad ?? 0;
  }

  agregar(producto: CartaItem): void {
    this._items.update(actual => {
      const existente = actual[producto.id_carta];
      return {
        ...actual,
        [producto.id_carta]: {
          producto,
          cantidad: (existente?.cantidad ?? 0) + 1
        }
      };
    });
  }

  quitar(idProducto: string): void {
    this._items.update(actual => {
      const existente = actual[idProducto];
      if (!existente) return actual;

      if (existente.cantidad <= 1) {
        const { [idProducto]: _, ...resto } = actual;
        return resto;
      }

      return {
        ...actual,
        [idProducto]: { ...existente, cantidad: existente.cantidad - 1 }
      };
    });
  }

  vaciar(): void {
    this._items.set({});
  }
  
  totalItems = computed(() =>
    Object.values(this._items()).reduce((acc, item) => acc + item.cantidad, 0)
  );

  importeTotal = computed(() =>
    Object.values(this._items()).reduce(
      (acc, item) => acc + item.producto.precio * item.cantidad, 0
    )
  );

  tiempoTotalEstimado = computed(() =>
    Object.values(this._items()).reduce(
      (acc, item) => acc + item.producto.tiempo_elaboracion * item.cantidad, 0
    )
  );

  items = computed(() => Object.values(this._items()));
}
