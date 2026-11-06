import { Component, computed, ElementRef, inject, OnDestroy, signal, viewChild } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { IonButton, IonContent, ToastController } from '@ionic/angular';

import { Vibracion } from '@app/services';
import { CuentaDelMozo, CuentasMozo, EstadoCuenta } from '@app/services/cuenta/cuenta';
import { HeaderComponent } from '@app/components/ui/header/header.component';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';

const ETIQUETA_ESTADO: Record<EstadoCuenta, string> = {
  cuenta_solicitada: 'Cuenta pedida',
  cuenta_entregada: 'Esperando el pago',
  pago_realizado: 'Pago realizado',
};

export type VistaPagos = 'cuentas' | 'pagos';

@Component({
  selector: 'app-pagos',
  standalone: true,
  templateUrl: './pagos.page.html',
  styleUrls: ['../cocina/cocina.page.scss', './pagos.page.scss'],
  imports: [HeaderComponent, CurrencyPipe, IonButton, IonContent, SpinnerLogoComponent],
})
export class PagosPage implements OnDestroy {
  cuentasMozo = inject(CuentasMozo);

  private _vibracion = inject(Vibracion);
  private _toastController = inject(ToastController);

  vista = signal<VistaPagos>('cuentas');

  private _viewport = viewChild<ElementRef<HTMLElement>>('viewport');
  indiceActual = signal(0);

  // cuenta que se está procesando
  procesando = signal<string | null>(null);

  lista = computed<CuentaDelMozo[]>(() =>
    this.vista() === 'cuentas'
      ? this.cuentasMozo.cuentasPedidas()
      : this.cuentasMozo.pagos()
  );

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
    this.vista.set(vista);
  }

  entregar(cuenta: CuentaDelMozo): Promise<void> {
    return this.procesar(cuenta, async () => {
      await this.cuentasMozo.entregarCuenta(cuenta);
      
      
    });
  }

  confirmar(cuenta: CuentaDelMozo): Promise<void> {
    console.log("PAGOS PAGE | CLICK EN CONFIRMAR PAGO MOZO")

    return this.procesar(cuenta, async () => {
      await this.cuentasMozo.confirmarPago(cuenta);
    });
  }

  private async procesar(cuenta: CuentaDelMozo, accion: () => Promise<void>): Promise<void> {
    this.procesando.set(cuenta.idUsuario);

    try {
      await accion();
      await this.cuentasMozo.cargar();
    } catch (error) {
      void this._vibracion.error();
      await this.avisar(
        error instanceof Error ? error.message : 'No pudimos completar la acción.',
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
        error instanceof Error ? error.message : 'No pudimos cargar los pagos.',
        'danger'
      );
    }
  }

  private async avisar(mensaje: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this._toastController.create({
      message: mensaje,
      duration: color === 'danger' ? 5000 : 3000,
      position: 'top',
      color,
    });

    await toast.present();
  }

  cambiarVista_card(vista: VistaPagos): void {
    if (vista === this.vista()) return;
    this.vista.set(vista);
    this.indiceActual.set(0);

    console.log("pago.page.ts | QWLEKJQWLEKJQQQQQQQQQQQ")
    console.log(this.cuentasMozo.cuentasPedidas())

    const viewport = this._viewport()?.nativeElement;
    if (viewport) {
      viewport.scrollLeft = 0;
    }
  }

  irA(indice: number): void {
    const viewport = this._viewport()?.nativeElement;
    const slide = viewport?.querySelectorAll<HTMLElement>('.slide')[indice];

    if (!viewport || !slide) return;

    this.indiceActual.set(indice);
    viewport.scrollTo({
      left: slide.offsetLeft - (viewport.clientWidth - slide.offsetWidth) / 2,
      behavior: 'smooth',
    });
  }

  alDesplazar(): void {
    const viewport = this._viewport()?.nativeElement;
    if (!viewport) return;

    const centro = viewport.scrollLeft + viewport.clientWidth / 2;
    const slides = Array.from(viewport.querySelectorAll<HTMLElement>('.slide'));

    let masCercano = 0;
    let distanciaMinima = Number.POSITIVE_INFINITY;

    slides.forEach((slide, indice) => {
      const distancia = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - centro);
      if (distancia < distanciaMinima) {
        distanciaMinima = distancia;
        masCercano = indice;
      }
    });

    if (masCercano !== this.indiceActual()) {
      this.indiceActual.set(masCercano);
    }
  }
}