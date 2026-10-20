import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { IonContent, ToastController } from '@ionic/angular';

import { Auth, Juegos, Vibracion } from '@app/services';
import { Pedido } from '@app/services/pedido/pedido';
import { HeaderComponent } from '@app/components/ui/header/header.component';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';

interface LineaCuenta {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  importe: number;
}

const NIVEL_PROPINA: Record<number, string> = {
  20: 'Excelente',
  15: 'Muy bueno',
  10: 'Bueno',
  5: 'Regular',
  0: 'Malo',
};

@Component({
  selector: 'app-cuenta',
  standalone: true,
  templateUrl: './cuenta.page.html',
  styleUrls: ['./cuenta.page.scss'],
  imports: [HeaderComponent, CurrencyPipe, IonContent, SpinnerLogoComponent],
})
export class CuentaPage {
  private _auth = inject(Auth);
  private _pedido = inject(Pedido);
  private _juegos = inject(Juegos);
  private _vibracion = inject(Vibracion);
  private _toastController = inject(ToastController);

  lineas = signal<LineaCuenta[]>([]);
  cargando = signal(false);

  // porcentaje elegido al escanear el QR de propina; null hasta que se lea
  propina = signal<number | null>(null);

  subtotal = computed(() =>
    this.lineas().reduce((total, linea) => total + linea.importe, 0)
  );

  ionViewWillEnter(): void {
    void this.cargar();
  }

  descuentoPorcentaje(): number {
    return this._juegos.descuentoActual() ?? 0;
  }

  descuentoImporte(): number {
    return Math.round((this.subtotal() * this.descuentoPorcentaje()) / 100);
  }

  // la propina se calcula sobre la cuenta ya con el descuento
  propinaImporte(): number {
    const porcentaje = this.propina();

    if (porcentaje === null) {
      return 0;
    }

    return Math.round(
      ((this.subtotal() - this.descuentoImporte()) * porcentaje) / 100
    );
  }

  total(): number {
    return this.subtotal() - this.descuentoImporte() + this.propinaImporte();
  }

  nivelPropina(): string {
    const porcentaje = this.propina();

    return porcentaje === null ? '' : NIVEL_PROPINA[porcentaje] ?? '';
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);

    try {
      const usuario = this._auth.usuarioActual();

      if (!usuario) {
        return;
      }

      await this._juegos.cargar();
      this.lineas.set(await this._pedido.obtenerLineasCuenta(usuario.id));
    } catch (error) {
      void this._vibracion.error();

      const toast = await this._toastController.create({
        message: error instanceof Error ? error.message : 'No pudimos cargar tu cuenta.',
        duration: 4000,
        position: 'top',
        color: 'danger',
      });

      await toast.present();
    } finally {
      this.cargando.set(false);
    }
  }
}