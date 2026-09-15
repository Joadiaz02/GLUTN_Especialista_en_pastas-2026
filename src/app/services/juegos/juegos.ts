import { inject, Injectable, signal } from '@angular/core';
import { Auth } from '../auth/auth';
import { EPerfilUsuario } from '../../enums';

// El descuento es único por estadía: cuenta solo el primer intento,
// en cualquiera de los 3 juegos, sin importar cuál se jugó primero.
// Después de ese primer intento se puede seguir jugando libremente,
// sin que cambie nada del descuento (puntos 14/15/21 del TP).
@Injectable({ providedIn: 'root' })
export class Juegos {
  private _auth = inject(Auth);

  private _descuentoObtenido = signal<number | null>(null);
  private _yaIntentoUnJuego = signal(false);

  descuentoActual(): number | null {
    return this._descuentoObtenido();
  }

  puedeJugarPorPrimeraVez(): boolean {
    return !this._yaIntentoUnJuego();
  }

  esClienteRegistrado(): boolean {
    return this._auth.obtenerPerfil() === EPerfilUsuario.ClienteRegistrado;
  }

  // Los clientes anónimos pueden jugar (ven ganó/perdió igual), pero
  // solo un cliente registrado se queda con el descuento real.
  registrarIntento(gano: boolean, porcentaje: number): void {
    if (this._yaIntentoUnJuego()) return;

    this._yaIntentoUnJuego.set(true);

    if (gano && this.esClienteRegistrado()) {
      this._descuentoObtenido.set(porcentaje);
    }
  }
}
