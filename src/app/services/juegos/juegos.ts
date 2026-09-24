import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { Auth } from '../auth/auth';
import { EPerfilUsuario } from '../../enums';

// El descuento es único por estadía: cuenta solo el primer intento,
// en cualquiera de los 3 juegos, sin importar cuál se jugó primero.
// Después de ese primer intento se puede seguir jugando libremente,
// sin que cambie nada del descuento (puntos 14/15/21 del TP).
//
// El intento pertenece a la estadía de UN usuario: si cierra sesión, o si
// entra otra persona en el mismo dispositivo, se empieza de cero.
//
// descuentoJuego: null = todavía no jugó su primer intento.
// 0 = ya jugó el primer intento y no le quedó descuento (perdió, o
// ganó pero es un cliente anónimo). >0 = porcentaje ganado.
@Injectable({ providedIn: 'root' })
export class Juegos {
  private _auth = inject(Auth);

  private _descuentoJuego = signal<number | null>(null);

  // Id del usuario logueado. Se compara por id y no por objeto porque
  // Supabase emite un usuario nuevo en cada refresco de token, y eso no
  // debe borrar el intento de quien sigue en la misma sesión.
  readonly idUsuario = computed<string | null>(
    () => this._auth.usuarioActual()?.id ?? null
  );

  constructor() {
    effect(() => {
      this.idUsuario();
      untracked(() => this._descuentoJuego.set(null));
    });
  }

  descuentoActual(): number | null {
    return this._descuentoJuego();
  }

  puedeJugarPorPrimeraVez(): boolean {
    return this._descuentoJuego() === null;
  }

  esClienteRegistrado(): boolean {
    return this._auth.obtenerPerfil() === EPerfilUsuario.ClienteRegistrado;
  }

  // Texto del cartel al salir en medio de una partida. Salir cuenta como
  // perder: si era el primer intento se pierde el descuento; si ya estaba
  // gastado, la partida solo se reinicia y se juega por diversión.
  avisoAbandono(): string {
    return this.puedeJugarPorPrimeraVez() && this.esClienteRegistrado()
      ? 'Si salís ahora, perdés este intento y te quedás sin descuento.'
      : 'Si salís ahora, se reinicia la partida.';
  }

  // Los clientes anónimos pueden jugar (ven ganó/perdió igual), pero
  // solo un cliente registrado se queda con el descuento real.
  registrarIntento(gano: boolean, porcentaje: number): void {
    // Sin usuario no hay estadía a la que anotarle el intento (ej. una
    // derrota que llega después de cerrar sesión).
    if (this.idUsuario() === null) return;

    if (!this.puedeJugarPorPrimeraVez()) return;

    this._descuentoJuego.set(gano && this.esClienteRegistrado() ? porcentaje : 0);
  }
}
