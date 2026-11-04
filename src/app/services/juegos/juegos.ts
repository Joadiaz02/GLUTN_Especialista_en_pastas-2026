import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { Auth } from '../auth/auth';
import { SupabaseService } from '../supabase.service';
import { EPerfilUsuario } from '../../enums';
import type { IdJuego } from './juegos.config';

// descuento único por estadía, solo el primer intento
@Injectable({ providedIn: 'root' })
export class Juegos {
  private _auth = inject(Auth);
  private _db = inject(SupabaseService);

  private _descuentoJuego = signal<number | null>(null);

  // la última partida terminada le dio el descuento
  readonly ganoDescuento = signal(false);

  // el primer intento se está jugando
  private _intentoEnCurso = false;

  // llamadas a la base en orden
  private _cola: Promise<unknown> = Promise.resolve();

  // usuario logueado, comparado por id
  readonly idUsuario = computed<string | null>(
    () => this._auth.usuarioActual()?.id ?? null
  );

  constructor() {
    effect(() => {
      const idUsuario = this.idUsuario();
      untracked(() => {
        this._descuentoJuego.set(null);
        this.ganoDescuento.set(false);
        this._intentoEnCurso = false;

        if (idUsuario) {
          void this.cargar();
        }
      });
    });
  }

  // trae el descuento de la estadía
  async cargar(): Promise<void> {
    const idUsuario = this.idUsuario();

    if (!idUsuario || this._intentoEnCurso) return;

    // espera que se guarde lo jugado para no leer un resultado viejo
    await this._cola;

    const { data, error } = await this._db.client.rpc('juego_descuento_actual');

    // descarta la respuesta si cambió algo
    if (error || this.idUsuario() !== idUsuario || this._intentoEnCurso) return;

    // manda la base: null es una estadía nueva sin jugar
    this._descuentoJuego.set(data as number | null);
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

  // texto del cartel al salir en medio de una partida
  avisoAbandono(): string {
    return this.puedeJugarPorPrimeraVez() && this.esClienteRegistrado()
      ? 'Si salís ahora, perdés este intento y te quedás sin descuento.'
      : 'Si salís ahora, se reinicia la partida.';
  }

  // anota el primer intento al empezar
  iniciarIntento(juego: IdJuego): void {
    if (this.idUsuario() === null || !this.puedeJugarPorPrimeraVez()) return;
    if (this._intentoEnCurso) return;

    this._intentoEnCurso = true;
    this.encolar(() => this._db.client.rpc('juego_iniciar', { p_juego: juego }));
  }

  // resultado neutro, no consume el intento
  anularIntento(): void {
    if (!this._intentoEnCurso) return;

    this._intentoEnCurso = false;
    this.encolar(() => this._db.client.rpc('juego_anular'));
  }

  // solo el cliente registrado se queda con el descuento
  registrarIntento(gano: boolean, porcentaje: number): void {
    // sin usuario no hay intento
    if (this.idUsuario() === null) return;

    // partida por diversión: ganar no da descuento
    if (!this.puedeJugarPorPrimeraVez()) {
      this.ganoDescuento.set(false);
      return;
    }

    this._intentoEnCurso = false;
    this.ganoDescuento.set(gano && this.esClienteRegistrado());
    this._descuentoJuego.set(gano && this.esClienteRegistrado() ? porcentaje : 0);

    this.encolar(() => this._db.client.rpc('juego_terminar', { p_gano: gano }));
  }

  // si la base falla el intento queda en memoria
  private encolar(llamada: () => PromiseLike<unknown>): void {
    this._cola = this._cola.then(llamada).catch(() => undefined);
  }
}
