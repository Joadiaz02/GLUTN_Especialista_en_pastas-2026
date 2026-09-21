import { Injectable, inject, signal, computed, effect, untracked } from '@angular/core';
import { Juegos } from '../juegos/juegos';
import {
  CONFIG_JUEGOS,
  SOPA_LETRAS_DURACION_SEGUNDOS,
  SOPA_LETRAS_PALABRAS_POR_PARTIDA,
} from '../juegos/juegos.config';

interface CeldaGrilla {
  fila: number;
  col: number;
}

const PORCENTAJE_SOPA_LETRAS = CONFIG_JUEGOS['sopa-de-letras'].porcentaje;
const TAMANO_GRILLA = 5;
const CANTIDAD_PALABRAS_POR_PARTIDA = SOPA_LETRAS_PALABRAS_POR_PARTIDA;
const DURACION_SEGUNDOS = SOPA_LETRAS_DURACION_SEGUNDOS;

// Ninguna palabra puede superar TAMANO_GRILLA letras, si no queda sin
// poder colocarse en la grilla (y el juego sería imposible de ganar).
const BANCO_PALABRAS = [
  'AJO', 'QUESO', 'TUCO', 'FIDEO', 'SALSA',
  'PASTA', 'CREMA', 'PESTO', 'PAN', 'SAL',
];

// Sopa de letras temática de pastas, a contrarreloj: hay que encontrar
// todas las palabras antes de que se acabe el tiempo (ver juegos.config).
// Si las encuentra a tiempo, gana; si no, pierde (ambos casos consumen
// el intento de la estadía). La sopa y las palabras no se generan hasta
// que el jugador aprieta "Comenzar". Salir en medio de una partida cuenta
// como perder (ver abandonarPartida).
@Injectable({ providedIn: 'root' })
export class SopaLetras {
  private juegos = inject(Juegos);

  readonly tamanoGrilla = TAMANO_GRILLA;

  iniciada = signal(false);
  grilla = signal<string[][]>([]);
  palabras = signal<string[]>([]);
  encontradas = signal<string[]>([]);
  juegoTerminado = signal(false);
  perdioPorTiempo = signal(false);
  tiempoRestante = signal(DURACION_SEGUNDOS);

  palabrasEncontradas = computed(() => this.encontradas().length);
  palabrasTotales = computed(() => this.palabras().length);

  private _intervaloId: ReturnType<typeof setInterval> | null = null;
  private _posicionesPorPalabra = new Map<string, CeldaGrilla[]>();

  constructor() {
    // Si cambia el usuario (logout o login de otra persona) se corta la
    // partida: el cronómetro no puede seguir corriendo y cargarle una
    // derrota al usuario siguiente.
    effect(() => {
      this.juegos.idUsuario();
      untracked(() => this.prepararPartida());
    });
  }

  // Deja el juego en su estado inicial: sin sopa, sin palabras y con el
  // cronómetro detenido, esperando a que el jugador toque "Comenzar".
  prepararPartida(): void {
    this.detenerTemporizador();

    this.iniciada.set(false);
    this.grilla.set([]);
    this.palabras.set([]);
    this.encontradas.set([]);
    this.juegoTerminado.set(false);
    this.perdioPorTiempo.set(false);
    this.tiempoRestante.set(DURACION_SEGUNDOS);
  }

  // Salir en medio de una partida cuenta como perder: si era el primer
  // intento de la estadía, se pierde el descuento; si ya estaba gastado,
  // registrarIntento no hace nada y se juega solo por diversión. En los dos
  // casos la sopa queda reiniciada (palabras y cronómetro nuevos al volver).
  abandonarPartida(): void {
    if (!this.iniciada() || this.juegoTerminado()) return;

    this.juegos.registrarIntento(false, PORCENTAJE_SOPA_LETRAS);
    this.prepararPartida();
  }

  iniciarPartida(): void {
    this.detenerTemporizador();

    this.palabras.set([]);
    this.encontradas.set([]);
    this.juegoTerminado.set(false);
    this.perdioPorTiempo.set(false);
    this.tiempoRestante.set(DURACION_SEGUNDOS);

    const palabrasBase = this.mezclarArray(BANCO_PALABRAS).slice(0, CANTIDAD_PALABRAS_POR_PARTIDA);
    this.palabras.set(palabrasBase);
    this.generarGrilla(palabrasBase);

    this.iniciada.set(true);
    this.iniciarTemporizador();
  }

  private iniciarTemporizador(): void {
    this._intervaloId = setInterval(() => {
      if (this.tiempoRestante() <= 1) {
        this.tiempoRestante.set(0);
        this.detenerTemporizador();
        this.perderPorTiempo();
        return;
      }

      this.tiempoRestante.update((t) => t - 1);
    }, 1000);
  }

  private detenerTemporizador(): void {
    if (this._intervaloId !== null) {
      clearInterval(this._intervaloId);
      this._intervaloId = null;
    }
  }

  private perderPorTiempo(): void {
    if (this.juegoTerminado()) return;

    this.juegoTerminado.set(true);
    this.perdioPorTiempo.set(true);

    this.juegos.registrarIntento(false, PORCENTAJE_SOPA_LETRAS);
  }

  generarGrilla(palabras: string[]): void {
    const tamaño = TAMANO_GRILLA;
    const grilla = Array.from({ length: tamaño }, () => Array(tamaño).fill(''));

    this._posicionesPorPalabra.clear();

    for (const palabra of palabras) {
      const posiciones = this.colocarPalabra(grilla, palabra);
      if (posiciones) {
        this._posicionesPorPalabra.set(palabra, posiciones);
      }
    }

    const letras = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
    for (let fila = 0; fila < tamaño; fila++) {
      for (let col = 0; col < tamaño; col++) {
        if (grilla[fila][col] === '') {
          grilla[fila][col] = letras[Math.floor(Math.random() * letras.length)];
        }
      }
    }

    this.grilla.set(grilla);
  }

  colocarPalabra(grilla: string[][], palabra: string): CeldaGrilla[] | null {
    const tamaño = grilla.length;
    let intentos = 0;

    while (intentos < 100) {
      intentos++;
      const horizontal = Math.random() > 0.5;
      const fila = Math.floor(Math.random() * tamaño);
      const col = Math.floor(Math.random() * tamaño);

      if (horizontal) {
        if (col + palabra.length > tamaño) continue;
        let puede = true;
        for (let i = 0; i < palabra.length; i++) {
          if (grilla[fila][col + i] !== '' && grilla[fila][col + i] !== palabra[i]) {
            puede = false;
            break;
          }
        }
        if (!puede) continue;

        const posiciones: CeldaGrilla[] = [];
        for (let i = 0; i < palabra.length; i++) {
          grilla[fila][col + i] = palabra[i];
          posiciones.push({ fila, col: col + i });
        }
        return posiciones;
      } else {
        if (fila + palabra.length > tamaño) continue;
        let puede = true;
        for (let i = 0; i < palabra.length; i++) {
          if (grilla[fila + i][col] !== '' && grilla[fila + i][col] !== palabra[i]) {
            puede = false;
            break;
          }
        }
        if (!puede) continue;

        const posiciones: CeldaGrilla[] = [];
        for (let i = 0; i < palabra.length; i++) {
          grilla[fila + i][col] = palabra[i];
          posiciones.push({ fila: fila + i, col });
        }
        return posiciones;
      }
    }

    return null;
  }

  esCeldaIluminada(fila: number, col: number): boolean {
    for (const palabra of this.encontradas()) {
      const posiciones = this._posicionesPorPalabra.get(palabra);
      if (posiciones?.some((p) => p.fila === fila && p.col === col)) {
        return true;
      }
    }
    return false;
  }

  verificarSeleccion(filaInicio: number, colInicio: number, filaFin: number, colFin: number): string {
    if (this.juegoTerminado()) return '';

    const letras = this.obtenerLetrasSeleccionadas(filaInicio, colInicio, filaFin, colFin);
    const palabra = letras.join('');
    const palabraInvertida = [...letras].reverse().join('');

    const encontrada = this.palabras().find(p => p === palabra || p === palabraInvertida);

    if (encontrada && !this.encontradas().includes(encontrada)) {
      this.encontradas.update(lista => [...lista, encontrada]);

      if (this.encontradas().length === this.palabras().length) {
        this.finalizarPartida();
      }
      return encontrada;
    }

    return '';
  }

  obtenerLetrasSeleccionadas(filaInicio: number, colInicio: number, filaFin: number, colFin: number): string[] {
    const grilla = this.grilla();
    const letras: string[] = [];
    const mismaFila = filaInicio === filaFin;
    const mismaColumna = colInicio === colFin;

    if (!mismaFila && !mismaColumna) return [];

    if (mismaFila) {
      const inicio = Math.min(colInicio, colFin);
      const fin = Math.max(colInicio, colFin);
      for (let col = inicio; col <= fin; col++) letras.push(grilla[filaInicio][col]);
    }

    if (mismaColumna) {
      const inicio = Math.min(filaInicio, filaFin);
      const fin = Math.max(filaInicio, filaFin);
      for (let fila = inicio; fila <= fin; fila++) letras.push(grilla[fila][colInicio]);
    }

    return letras;
  }

  finalizarPartida(): void {
    if (this.juegoTerminado()) return;

    this.detenerTemporizador();
    this.juegoTerminado.set(true);

    // Encontró las 3 palabras a tiempo -> gano. Si ya se habia jugado el
    // primer intento en otro juego, Juegos.registrarIntento no hace nada.
    this.juegos.registrarIntento(true, PORCENTAJE_SOPA_LETRAS);
  }

  mezclarArray<T>(array: T[]): T[] {
    const copia = [...array];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  }
}
