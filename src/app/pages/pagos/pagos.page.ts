
import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { IonButton, IonContent, ToastController } from '@ionic/angular';

import { Vibracion } from '@app/services';
import {
  CuentaDelMozo,
  CuentasMozo,
  EstadoCuenta,
} from '@app/services/cuenta/cuenta';
import { HeaderComponent } from '@app/components/ui/header/header.component';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { LimitesListaDirective } from '@app/directives/limites-lista.directive';

const ETIQUETA_ESTADO: Record<EstadoCuenta, string> = {
  cuenta_solicitada: 'Cuenta pedida',
  cuenta_entregada: 'Esperando el pago',
  pago_realizado: 'Pago realizado',
};

export type VistaPagos = 'cuentas' | 'pagos';

interface CuentaDeslizable extends CuentaDelMozo {
  numeroCuenta: number;
  totalCuentasMesa: number;
}

interface GrupoMesaPagos {
  idMesa: string;
  numeroMesa: string;
  cuentas: CuentaDeslizable[];
}

@Component({
  selector: 'app-pagos',
  standalone: true,
  templateUrl: './pagos.page.html',
  styleUrls: ['../cocina/cocina.page.scss', './pagos.page.scss'],
  imports: [
    HeaderComponent,
    CurrencyPipe,
    IonButton,
    IonContent,
    SpinnerLogoComponent,
    LimitesListaDirective,
  ],
})
export class PagosPage implements OnDestroy {
  cuentasMozo = inject(CuentasMozo);

  private _vibracion = inject(Vibracion);
  private _toastController = inject(ToastController);

  vista = signal<VistaPagos>('cuentas');

  private _viewport = viewChild<ElementRef<HTMLElement>>('viewport');

  indiceMesaActual = signal(0);
  indiceCuentaActual = signal(0);

  procesando = signal<string | null>(null);

  lista = computed<CuentaDelMozo[]>(() =>
    this.vista() === 'cuentas'
      ? this.cuentasMozo.cuentasPedidas()
      : this.cuentasMozo.pagos()
  );

  mesas = computed<GrupoMesaPagos[]>(() => {
    const grupos = new Map<string, CuentaDelMozo[]>();

    for (const cuenta of this.lista()) {
      const existentes = grupos.get(cuenta.idMesa) ?? [];
      existentes.push(cuenta);
      grupos.set(cuenta.idMesa, existentes);
    }

    return Array.from(grupos.entries()).map(([idMesa, cuentas]) => ({
      idMesa,
      numeroMesa: cuentas[0]?.numeroMesa ?? 'Sin número',
      cuentas: cuentas.map((cuenta, indice) => ({
        ...cuenta,
        numeroCuenta: indice + 1,
        totalCuentasMesa: cuentas.length,
      })),
    }));
  });

  constructor() {
    effect(() => {
      const ultimaMesa = Math.max(0, this.mesas().length - 1);

      if (this.indiceMesaActual() > ultimaMesa) {
        this.indiceMesaActual.set(ultimaMesa);
      }

      const cuentasMesa =
        this.mesas()[this.indiceMesaActual()]?.cuentas ?? [];

      const ultimaCuenta = Math.max(0, cuentasMesa.length - 1);

      if (this.indiceCuentaActual() > ultimaCuenta) {
        this.indiceCuentaActual.set(ultimaCuenta);
      }
    });
  }

  ionViewWillEnter(): void {
    void this.iniciar();
  }

  ngOnDestroy(): void {
    this.cuentasMozo.detener();
  }

  etiqueta(estado: EstadoCuenta): string {
    return ETIQUETA_ESTADO[estado];
  }

  cambiarVista(vista: VistaPagos): void {
    if (vista === this.vista()) {
      return;
    }

    this.vista.set(vista);
    this.indiceMesaActual.set(0);
    this.indiceCuentaActual.set(0);

    const viewport = this._viewport()?.nativeElement;

    viewport?.scrollTo({
      left: 0,
      top: 0,
      behavior: 'instant',
    });
  }

  irAMesa(indice: number): void {
    const viewport = this._viewport()?.nativeElement;
    const slide =
      viewport?.querySelectorAll<HTMLElement>('.mesa-slide')[indice];

    if (!viewport || !slide) {
      return;
    }

    this.indiceMesaActual.set(indice);
    this.indiceCuentaActual.set(0);

    viewport.scrollTo({
      left:
        slide.offsetLeft -
        (viewport.clientWidth - slide.offsetWidth) / 2,
      behavior: 'smooth',
    });
  }

  alDesplazarMesas(): void {
    const viewport = this._viewport()?.nativeElement;

    if (!viewport) {
      return;
    }

    const centro = viewport.scrollLeft + viewport.clientWidth / 2;
    const slides = Array.from(
      viewport.querySelectorAll<HTMLElement>('.mesa-slide')
    );

    let masCercano = 0;
    let distanciaMinima = Number.POSITIVE_INFINITY;

    slides.forEach((slide, indice) => {
      const distancia = Math.abs(
        slide.offsetLeft + slide.offsetWidth / 2 - centro
      );

      if (distancia < distanciaMinima) {
        distanciaMinima = distancia;
        masCercano = indice;
      }
    });

    if (masCercano !== this.indiceMesaActual()) {
      this.indiceMesaActual.set(masCercano);
      this.indiceCuentaActual.set(0);
    }
  }

  alDesplazarCuentas(): void {
    const viewport = this._viewport()?.nativeElement;

    const mesaActual = viewport?.querySelectorAll<HTMLElement>(
      '.mesa-slide'
    )[this.indiceMesaActual()];

    const lista = mesaActual?.querySelector<HTMLElement>(
      '.mesa-cuentas'
    );

    if (!lista) {
      return;
    }

    const centro = lista.scrollTop + lista.clientHeight / 2;

    const slides = Array.from(
      lista.querySelectorAll<HTMLElement>('.cuenta-slide')
    );

    let masCercana = 0;
    let distanciaMinima = Number.POSITIVE_INFINITY;

    slides.forEach((slide, indice) => {
      const distancia = Math.abs(
        slide.offsetTop + slide.offsetHeight / 2 - centro
      );

      if (distancia < distanciaMinima) {
        distanciaMinima = distancia;
        masCercana = indice;
      }
    });

    if (masCercana !== this.indiceCuentaActual()) {
      this.indiceCuentaActual.set(masCercana);
    }
  }

  entregar(cuenta: CuentaDelMozo): Promise<void> {
    return this.procesar(cuenta, () =>
      this.cuentasMozo.entregarCuenta(cuenta)
    );
  }

  confirmar(cuenta: CuentaDelMozo): Promise<void> {
    return this.procesar(cuenta, () =>
      this.cuentasMozo.confirmarPago(cuenta)
    );
  }

  private async procesar(
    cuenta: CuentaDelMozo,
    accion: () => Promise<void>
  ): Promise<void> {
    this.procesando.set(cuenta.idUsuario);

    try {
      await accion();
      await this.cuentasMozo.cargar();
    } catch (error) {
      void this._vibracion.error();

      await this.avisar(
        error instanceof Error
          ? error.message
          : 'No pudimos completar la acción.',
        'danger'
      );
    } finally {
      this.procesando.set(null);
    }
  }

  private async iniciar(): Promise<void> {
    try {
      await this.cuentasMozo.iniciar();
    } catch (error) {
      void this._vibracion.error();

      await this.avisar(
        error instanceof Error
          ? error.message
          : 'No pudimos cargar los pagos.',
        'danger'
      );
    }
  }

  private async avisar(
    mensaje: string,
    color: 'success' | 'danger'
  ): Promise<void> {
    const toast = await this._toastController.create({
      message: mensaje,
      duration: color === 'danger' ? 5000 : 3000,
      position: 'top',
      color,
    });

    await toast.present();
  }
}
