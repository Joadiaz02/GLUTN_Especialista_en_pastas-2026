import { Service, signal } from '@angular/core';

@Service()
export class Propina {
  private _propinaActual = signal<number | null>(null)

  get propinaActual() {
    return this._propinaActual;
  }

  setPropinaPorcentaje(porcentaje: number) {
    this._propinaActual.set(porcentaje)
  }
}
