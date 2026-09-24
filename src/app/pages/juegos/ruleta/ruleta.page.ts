import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
} from '@ionic/angular';
import { Router } from '@angular/router';
import { Juegos, Vibracion } from '@app/services';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { ConfirmDialogComponent } from '@app/components/ui/confirm-cartel/confirm-cartel.component';
import { Auth } from '../../../services/auth/auth';

type EstadoRuleta = 'quieta' | 'girando' | 'frenando' | 'resultado';
type ResultadoSector = 'gana' | 'pierde' | 'reintenta';

interface SectorRuleta {
  tipo: ResultadoSector;
  desde: number;
  hasta: number;
  color: string;
  colorTexto: string;
  simbolo: string;
}

const PORCENTAJE_RULETA = 20;

// 10 sectores de 36° cada uno, intercalados (no agrupados) para que
// se vea como una ruleta real: 4 "gana" / 3 "pierde" / 3 "reintenta".
const ORDEN_TIPOS: ResultadoSector[] = [
  'gana', 'pierde', 'reintenta',
  'gana', 'pierde', 'reintenta',
  'gana', 'pierde', 'reintenta',
  'gana',
];

const ESTILO_POR_TIPO: Record<ResultadoSector, { color: string; colorTexto: string; simbolo: string }> = {
  gana: { color: '#E76F45', colorTexto: '#FFFFFF', simbolo: '✓' },
  pierde: { color: '#8CA273', colorTexto: '#FFFFFF', simbolo: '✗' },
  reintenta: { color: '#D5E0C9', colorTexto: '#657A4D', simbolo: '↻' },
};

const VELOCIDAD_GRADOS_POR_FRAME = 6;
const VUELTAS_EXTRA_AL_FRENAR = 5;

@Component({
  selector: 'app-ruleta',
  standalone: true,
  templateUrl: './ruleta.page.html',
  styleUrls: ['./ruleta.page.scss'],
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
export class RuletaPage implements OnDestroy {
  private _juegosService = inject(Juegos);
  private _vibracion = inject(Vibracion);
  private _authService = inject(Auth);
  private _router = inject(Router);

  private _rafId: number | null = null;
  private _indiceResultado = 0;

  readonly sectores: SectorRuleta[] = ORDEN_TIPOS.map((tipo, i) => ({
    tipo,
    desde: i * 36,
    hasta: (i + 1) * 36,
    ...ESTILO_POR_TIPO[tipo],
  }));

  readonly gradienteRuleta = this.sectores
    .map((s) => `${s.color} ${s.desde}deg ${s.hasta}deg`)
    .join(', ');

  estado = signal<EstadoRuleta>('quieta');
  resultadoTipo = signal<ResultadoSector | null>(null);
  rotacion = signal(0);
  transicionActiva = signal(false);

  transformRueda = computed(() => `rotate(${this.rotacion()}deg)`);
  transitionRueda = computed(() =>
    this.transicionActiva() ? 'transform 2.6s cubic-bezier(0.12, 0.67, 0.14, 1)' : 'none'
  );

  ngOnDestroy(): void {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
    }
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
    return this.estado() === 'girando' || this.estado() === 'frenando'
      ? 'La ruleta está girando. Si salís ahora, perdés este intento.'
      : 'Vas a salir del juego de la ruleta.';
  }

  textoBoton(): string {
    if (this.estado() === 'girando' || this.estado() === 'frenando') return 'Parar';
    if (this.estado() === 'resultado') {
      return this.resultadoTipo() === 'reintenta' ? 'Volver a intentar' : 'Jugar de nuevo';
    }
    return 'Comenzar';
  }

  onBotonClick(): void {
    if (this.estado() === 'quieta') {
      this.comenzar();
    } else if (this.estado() === 'girando') {
      this.parar();
    } else if (this.estado() === 'resultado') {
      this.resultadoTipo.set(null);
      this.estado.set('quieta');
    }
  }

  private comenzar(): void {
    this.estado.set('girando');
    this.transicionActiva.set(false);
    this._rafId = requestAnimationFrame(this.loopGirar);
  }

  private loopGirar = (): void => {
    this.rotacion.update((r) => r + VELOCIDAD_GRADOS_POR_FRAME);
    this._rafId = requestAnimationFrame(this.loopGirar);
  };

  private parar(): void {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    this.estado.set('frenando');

    const indice = this.sortearIndice();
    this._indiceResultado = indice;

    const actualMod = this.rotacion() % 360;
    const centroSector = indice * 36 + 18;
    const objetivoMod = (360 - centroSector) % 360;
    const delta = (objetivoMod - actualMod + 360) % 360;

    this.transicionActiva.set(true);
    this.rotacion.update((r) => r + delta + VUELTAS_EXTRA_AL_FRENAR * 360);
  }

  onTransitionEnd(event: TransitionEvent): void {
    if (event.propertyName !== 'transform' || this.estado() !== 'frenando') return;

    this.transicionActiva.set(false);
    this.estado.set('resultado');

    void this.procesarResultado(this._indiceResultado);
  }

  private sortearIndice(): number {
    const n = Math.random() * 100;
    const tipo: ResultadoSector = n < 40 ? 'gana' : n < 70 ? 'pierde' : 'reintenta';

    const candidatos = this.sectores
      .map((s, i) => ({ tipo: s.tipo, indice: i }))
      .filter((s) => s.tipo === tipo);

    return candidatos[Math.floor(Math.random() * candidatos.length)].indice;
  }

  private async procesarResultado(indice: number): Promise<void> {
    const tipo = this.sectores[indice].tipo;
    this.resultadoTipo.set(tipo);

    // "Reintenta" es neutro: no consume el intento ni cuenta como
    // gano/perdio para el descuento de la estadia.
    if (tipo === 'gana') {
      this._juegosService.registrarIntento(true, PORCENTAJE_RULETA);
      await this._vibracion.confirmacion();
    } else if (tipo === 'pierde') {
      this._juegosService.registrarIntento(false, PORCENTAJE_RULETA);
      await this._vibracion.error();
    }
  }

  volver(): void {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._router.navigate(['/juegos'], { state: { origenValido: true } });
  }

  async cerrarSesion(): Promise<void> {
    await this._authService.logout();

    localStorage.removeItem('mesa');

    void this._router.navigate(['/login']);
  }
}
