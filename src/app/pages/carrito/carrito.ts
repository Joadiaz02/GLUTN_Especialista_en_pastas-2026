import { Injectable, signal } from '@angular/core';

// Cantidad de cada producto agregado, por id de producto.
// Signal en vez de variable plana: cualquier componente que lo lea
// en su template se actualiza solo cuando cambia, sin lógica extra.
@Injectable({ providedIn: 'root' })
export class Carrito {

  private _cantidades = signal<Record<string, number>>({});

  cantidadDe(idProducto: string): number {
    return this._cantidades()[idProducto] ?? 0;
  }

  agregar(idProducto: string): void {
    this._cantidades.update(actual => ({
      ...actual,
      [idProducto]: (actual[idProducto] ?? 0) + 1
    }));
  }

  quitar(idProducto: string): void {
    this._cantidades.update(actual => {
      const cantidadActual = actual[idProducto] ?? 0;

      if (cantidadActual <= 1) {
        const { [idProducto]: _, ...resto } = actual;
        return resto;
      }

      return { ...actual, [idProducto]: cantidadActual - 1 };
    });
  }

  totalItems(): number {
    return Object.values(this._cantidades()).reduce((acc, c) => acc + c, 0);
  }
}
