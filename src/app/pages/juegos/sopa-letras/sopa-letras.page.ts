import { Component, effect, inject, OnDestroy, OnInit } from '@angular/core';
import {
  IonContent,
  IonButton,
} from '@ionic/angular';
import { Router } from '@angular/router';
import {
  CONFIG_JUEGOS,
  Juegos,
  SOPA_LETRAS_DURACION_SEGUNDOS,
  SOPA_LETRAS_PALABRAS_POR_PARTIDA,
  SopaLetras,
  Vibracion,
} from '@app/services';
import { Auth } from '../../../services/auth/auth';
import { HeaderComponent } from '@app/components/ui/header/header.component';

interface CeldaSeleccionada {
  fila: number;
  col: number;
}

@Component({
  selector: 'app-sopa-letras',
  standalone: true,
  templateUrl: './sopa-letras.page.html',
  styleUrls: ['./sopa-letras.page.scss'],
  imports: [
    HeaderComponent,
    IonContent,
    IonButton,
  ],
})
export class SopaLetrasPage implements OnInit, OnDestroy {
  sopaLetras = inject(SopaLetras);

  private _juegosService = inject(Juegos);
  private _vibracion = inject(Vibracion);
  private _authService = inject(Auth);
  private _router = inject(Router);

  readonly porcentaje = CONFIG_JUEGOS['sopa-de-letras'].porcentaje;
  readonly palabrasPorPartida = SOPA_LETRAS_PALABRAS_POR_PARTIDA;
  readonly duracionSegundos = SOPA_LETRAS_DURACION_SEGUNDOS;

  celdaInicio: CeldaSeleccionada | null = null;
  private _yaVibroFinal = false;

  constructor() {
    // detecta el fin de la partida por palabra o por tiempo
    effect(() => {
      const terminado = this.sopaLetras.juegoTerminado();

      if (!terminado || this._yaVibroFinal) return;

      this._yaVibroFinal = true;

      if (this.sopaLetras.perdioPorTiempo()) {
        void this._vibracion.error();
      } else {
        void this._vibracion.confirmacion();
      }
    });
  }

  ngOnInit(): void {
    this._yaVibroFinal = false;
    this.celdaInicio = null;
    this.sopaLetras.prepararPartida();
  }

  // salir en medio de la partida cuenta como perder
  ionViewWillLeave(): void {
    this.abandonar();
  }

  ngOnDestroy(): void {
    this.abandonar();
  }

  private abandonar(): void {
    this.celdaInicio = null;
    this.sopaLetras.abandonarPartida();
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
    const enCurso = this.sopaLetras.iniciada() && !this.sopaLetras.juegoTerminado();

    if (!enCurso) {
      return 'Vas a salir de la sopa de letras.';
    }

    return `La partida está en curso. ${this._juegosService.avisoAbandono()}`;
  }

  tiempoFormateado(): string {
    const total = this.sopaLetras.tiempoRestante();
    const minutos = Math.floor(total / 60);
    const segundos = total % 60;
    return `${minutos}:${segundos.toString().padStart(2, '0')}`;
  }

  esCeldaInicio(fila: number, col: number): boolean {
    return this.celdaInicio?.fila === fila && this.celdaInicio?.col === col;
  }

  estaEncontrada(palabra: string): boolean {
    return this.sopaLetras.encontradas().includes(palabra);
  }

  onCeldaClick(fila: number, col: number): void {
    if (this.sopaLetras.juegoTerminado()) return;

    if (!this.celdaInicio) {
      this.celdaInicio = { fila, col };
      return;
    }

    const inicio = this.celdaInicio;
    this.celdaInicio = null;

    this.sopaLetras.verificarSeleccion(inicio.fila, inicio.col, fila, col);
  }

  comenzar(): void {
    this._yaVibroFinal = false;
    this.celdaInicio = null;
    this.sopaLetras.iniciarPartida();
  }

  jugarDeNuevo(): void {
    this._yaVibroFinal = false;
    this.celdaInicio = null;
    this.sopaLetras.prepararPartida();
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
