import { Component, inject, OnDestroy, signal } from '@angular/core';
import {
  IonContent,
  IonButton,
} from '@ionic/angular';
import { Router } from '@angular/router';
import { CONFIG_JUEGOS, Juegos } from '@app/services';
import { Auth } from '../../../services/auth/auth';
import { HeaderComponent } from '@app/components/ui/header/header.component';

type EstadoTaTeTi = 'jugando' | 'resultado';
type Celda = 'X' | 'O' | null;
type ResultadoTaTeTi = 'gana' | 'pierde' | 'empate';

const PORCENTAJE_TATETI = CONFIG_JUEGOS['ta-te-ti'].porcentaje;
const DEMORA_PC_MS = 500;

const LINEAS_GANADORAS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

@Component({
  selector: 'app-ta-te-ti',
  standalone: true,
  templateUrl: './ta-te-ti.page.html',
  styleUrls: ['./ta-te-ti.page.scss'],
  imports: [
    HeaderComponent,
    IonContent,
    IonButton,
  ],
})
export class TaTeTiPage implements OnDestroy {
  private _juegosService = inject(Juegos);
  private _authService = inject(Auth);
  private _router = inject(Router);

  private _timeoutPc: ReturnType<typeof setTimeout> | null = null;

  readonly porcentaje = PORCENTAJE_TATETI;

  estado = signal<EstadoTaTeTi>('jugando');
  celdas = signal<Celda[]>(Array(9).fill(null));
  turnoPc = signal(false);
  resultadoTipo = signal<ResultadoTaTeTi | null>(null);

  // salir con una partida en curso cuenta como perder
  ionViewWillLeave(): void {
    this.abandonar();
  }

  ngOnDestroy(): void {
    this.abandonar();
  }

  // sin marcas todavía no hay partida
  private enCurso(): boolean {
    return this.estado() === 'jugando' && this.celdas().some((c) => c !== null);
  }

  private detenerTurnoPc(): void {
    if (this._timeoutPc !== null) {
      clearTimeout(this._timeoutPc);
      this._timeoutPc = null;
    }
  }

  private abandonar(): void {
    this.detenerTurnoPc();

    if (!this.enCurso()) return;

    this._juegosService.registrarIntento(false, PORCENTAJE_TATETI);

    this.celdas.set(Array(9).fill(null));
    this.turnoPc.set(false);
  }

  puedeJugarPorPrimeraVez(): boolean {
    return this._juegosService.puedeJugarPorPrimeraVez();
  }

  esClienteRegistrado(): boolean {
    return this._juegosService.esClienteRegistrado();
  }

  ganoDescuento(): boolean {
    return this._juegosService.ganoDescuento();
  }

  mensajeEstado(): string {
    if (!this.esClienteRegistrado()) {
      return 'Registrate para participar de estos descuentos';
    }
    if (this.puedeJugarPorPrimeraVez()) {
      return 'Jugá por un descuento en tu cuenta';
    }
    return 'Jugá por diversión';
  }

  mensajeVolver(): string {
    return this.enCurso()
      ? `La partida está en curso. ${this._juegosService.avisoAbandono()}`
      : 'Vas a salir del juego de ta-te-ti.';
  }

  textoBoton(): string {
    return this.resultadoTipo() === 'empate' ? 'Volver a intentar' : 'Jugar de nuevo';
  }

  jugar(indice: number): void {
    if (this.estado() !== 'jugando' || this.turnoPc() || this.celdas()[indice] !== null) return;

    // la primera marca empieza la partida
    if (this.celdas().every((celda) => celda === null)) {
      this._juegosService.iniciarIntento('ta-te-ti');
    }

    this.celdas.update((celdas) => {
      const copia = [...celdas];
      copia[indice] = 'X';
      return copia;
    });

    if (this.finDePartida()) return;

    this.turnoPc.set(true);
    this._timeoutPc = setTimeout(() => this.jugarPc(), DEMORA_PC_MS);
  }

  private jugarPc(): void {
    const libres = this.celdas()
      .map((celda, i) => (celda === null ? i : -1))
      .filter((i) => i !== -1);

    const indice = libres[Math.floor(Math.random() * libres.length)];

    this.celdas.update((celdas) => {
      const copia = [...celdas];
      copia[indice] = 'O';
      return copia;
    });

    this.turnoPc.set(false);
    this.finDePartida();
  }

  private finDePartida(): boolean {
    const celdas = this.celdas();
    const ganador = this.chequearGanador(celdas);

    if (ganador) {
      void this.procesarResultado(ganador === 'X' ? 'gana' : 'pierde');
      return true;
    }

    if (celdas.every((celda) => celda !== null)) {
      void this.procesarResultado('empate');
      return true;
    }

    return false;
  }

  private chequearGanador(celdas: Celda[]): Celda {
    for (const [a, b, c] of LINEAS_GANADORAS) {
      if (celdas[a] && celdas[a] === celdas[b] && celdas[a] === celdas[c]) {
        return celdas[a];
      }
    }
    return null;
  }

  // el empate no consume el intento
  private async procesarResultado(tipo: ResultadoTaTeTi): Promise<void> {
    this.resultadoTipo.set(tipo);
    this.estado.set('resultado');

    if (tipo === 'gana') {
      this._juegosService.registrarIntento(true, PORCENTAJE_TATETI);
    } else if (tipo === 'pierde') {
      this._juegosService.registrarIntento(false, PORCENTAJE_TATETI);
    } else {
      this._juegosService.anularIntento();
    }
  }

  jugarDeNuevo(): void {
    this.celdas.set(Array(9).fill(null));
    this.resultadoTipo.set(null);
    this.turnoPc.set(false);
    this.estado.set('jugando');
  }

  volver(): void {
    this.abandonar();
    this._router.navigate(['/juegos'], { state: { origenValido: true } });
  }

  async cerrarSesion(): Promise<void> {
    await this._authService.logout();

    localStorage.removeItem('mesa');

    void this._router.navigate(['/login']);
  }
}
