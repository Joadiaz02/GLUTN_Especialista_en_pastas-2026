import { inject, Injectable, signal } from '@angular/core';
import { Auth } from '../auth/auth';
import { EPerfilUsuario } from '../../enums';

// El descuento es único por estadía: cuenta solo el primer intento,
// en cualquiera de los 3 juegos, sin importar cuál se jugó primero.
// Después de ese primer intento se puede seguir jugando libremente,
// sin que cambie nada del descuento (puntos 14/15/21 del TP).
//
// descuentoJuego: null = todavía no jugó su primer intento.
// 0 = ya jugó el primer intento y no le quedó descuento (perdió, o
// ganó pero es un cliente anónimo). >0 = porcentaje ganado.
@Injectable({ providedIn: 'root' })
export class Juegos {
  private _auth = inject(Auth);

  private _descuentoJuego = signal<number | null>(null);

  descuentoActual(): number | null {
    return this._descuentoJuego();
  }

  puedeJugarPorPrimeraVez(): boolean {
    return this._descuentoJuego() === null;
  }

  esClienteRegistrado(): boolean {
    return this._auth.obtenerPerfil() === EPerfilUsuario.ClienteRegistrado;
  }

  // Los clientes anónimos pueden jugar (ven ganó/perdió igual), pero
  // solo un cliente registrado se queda con el descuento real.
  registrarIntento(gano: boolean, porcentaje: number): void {
    if (!this.puedeJugarPorPrimeraVez()) return;

    this._descuentoJuego.set(gano && this.esClienteRegistrado() ? porcentaje : 0);
  }
}
