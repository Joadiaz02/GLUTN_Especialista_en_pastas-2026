import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { Auth } from '../auth/auth';
import { SupabaseService } from '../supabase.service';
import { EPerfilUsuario } from '../../enums';
import type { IdJuego } from './juegos.config';

// El descuento es único por estadía: cuenta solo el primer intento,
// en cualquiera de los 3 juegos, sin importar cuál se jugó primero.
// Después de ese primer intento se puede seguir jugando libremente,
// sin que cambie nada del descuento (puntos 14/15/21 del TP).
//
// El intento se guarda en Supabase, atado a la estadía del cliente (ver
// supabase/sql/descuento_juegos.sql): cerrar la app o volver a entrar no
// devuelve el primer intento. Si no hay estadía (cliente sin mesa
// asignada) o falla la conexión, el intento vive solo en memoria.
//
// descuentoJuego: null = todavía no jugó su primer intento.
// 0 = ya jugó el primer intento y no le quedó descuento (perdió, o
// ganó pero es un cliente anónimo). >0 = porcentaje ganado.
@Injectable({ providedIn: 'root' })
export class Juegos {
  private _auth = inject(Auth);
  private _db = inject(SupabaseService);

  private _descuentoJuego = signal<number | null>(null);

  // El primer intento se está jugando: ya quedó anotado en la base (así
  // cerrar la app a mitad de partida cuenta como perder), pero todavía
  // se juega por el descuento.
  private _intentoEnCurso = false;

  // Las llamadas a la base van en orden: terminar un intento no puede
  // llegar antes que haberlo iniciado.
  private _cola: Promise<unknown> = Promise.resolve();

  // Id del usuario logueado. Se compara por id y no por objeto porque
  // Supabase emite un usuario nuevo en cada refresco de token, y eso no
  // debe borrar el intento de quien sigue en la misma sesión.
  readonly idUsuario = computed<string | null>(
    () => this._auth.usuarioActual()?.id ?? null
  );

  constructor() {
    effect(() => {
      const idUsuario = this.idUsuario();
      untracked(() => {
        this._descuentoJuego.set(null);
        this._intentoEnCurso = false;

        if (idUsuario) {
          void this.cargar();
        }
      });
    });
  }

  // Trae de la base el descuento de la estadía actual.
  async cargar(): Promise<void> {
    const idUsuario = this.idUsuario();

    if (!idUsuario || this._intentoEnCurso) return;

    const { data, error } = await this._db.client.rpc('juego_descuento_actual');

    // Si mientras tanto cambió el usuario o empezó una partida, la
    // respuesta ya no sirve.
    if (error || this.idUsuario() !== idUsuario || this._intentoEnCurso) return;

    // Un null de la base no borra un intento que ya se jugó en memoria.
    if (data !== null) {
      this._descuentoJuego.set(data as number);
    }
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

  // Se llama al empezar cada partida. Si es el primer intento, lo anota en
  // la base antes de saber el resultado.
  iniciarIntento(juego: IdJuego): void {
    if (this.idUsuario() === null || !this.puedeJugarPorPrimeraVez()) return;
    if (this._intentoEnCurso) return;

    this._intentoEnCurso = true;
    this.encolar(() => this._db.client.rpc('juego_iniciar', { p_juego: juego }));
  }

  // Resultado neutro (empate, "Volvé a intentarlo"): el primer intento no
  // se consume y la próxima partida vuelve a ser por el descuento.
  anularIntento(): void {
    if (!this._intentoEnCurso) return;

    this._intentoEnCurso = false;
    this.encolar(() => this._db.client.rpc('juego_anular'));
  }

  // Los clientes anónimos pueden jugar (ven ganó/perdió igual), pero
  // solo un cliente registrado se queda con el descuento real. La base
  // aplica la misma regla y es la que decide el porcentaje final.
  registrarIntento(gano: boolean, porcentaje: number): void {
    // Sin usuario no hay estadía a la que anotarle el intento (ej. una
    // derrota que llega después de cerrar sesión).
    if (this.idUsuario() === null) return;

    if (!this.puedeJugarPorPrimeraVez()) return;

    this._intentoEnCurso = false;
    this._descuentoJuego.set(gano && this.esClienteRegistrado() ? porcentaje : 0);

    this.encolar(() => this._db.client.rpc('juego_terminar', { p_gano: gano }));
  }

  // Si la base no responde, el juego sigue: el intento queda en memoria.
  private encolar(llamada: () => PromiseLike<unknown>): void {
    this._cola = this._cola.then(llamada).catch(() => undefined);
  }
}
