import { Component, effect, inject, OnInit } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
} from '@ionic/angular';
import { Router } from '@angular/router';
import { Juegos, SopaLetras, Vibracion } from '@app/services';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { ConfirmDialogComponent } from '@app/components/ui/confirm-cartel/confirm-cartel.component';
import { Auth } from '../../../services/auth/auth';

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
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    ConfirmVolverComponent,
    ConfirmDialogComponent,
  ],
})
export class SopaLetrasPage implements OnInit {
  sopaLetras = inject(SopaLetras);

  private _juegosService = inject(Juegos);
  private _vibracion = inject(Vibracion);
  private _authService = inject(Auth);
  private _router = inject(Router);

  celdaInicio: CeldaSeleccionada | null = null;
  private _yaVibroFinal = false;

  constructor() {
    // El fin de partida puede llegar por un click (encontró la última
    // palabra) o solo por el paso del tiempo (setInterval del service) —
    // con un effect() cubrimos los dos casos sin duplicar lógica.
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
    this.sopaLetras.iniciarPartida();
  }

  puedeJugarPorPrimeraVez(): boolean {
    return this._juegosService.puedeJugarPorPrimeraVez();
  }

  esClienteRegistrado(): boolean {
    return this._juegosService.esClienteRegistrado();
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
    return 'El cronómetro sigue corriendo aunque salgas — podrías perder por tiempo.';
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

  jugarDeNuevo(): void {
    this._yaVibroFinal = false;
    this.sopaLetras.iniciarPartida();
  }

  volver(): void {
    this._router.navigate(['/juegos'], { state: { origenValido: true } });
  }

  async cerrarSesion(): Promise<void> {
    await this._authService.logout();

    localStorage.removeItem('mesa');

    void this._router.navigate(['/login']);
  }
}
