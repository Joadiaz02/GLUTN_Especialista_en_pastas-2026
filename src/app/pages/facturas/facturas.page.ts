import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { IonButton, IonContent, IonIcon, ToastController } from '@ionic/angular';

import { Auth, Vibracion } from '@app/services';
import { Factura, FacturaCliente } from '@app/services/factura/factura';
import { HeaderComponent } from '@app/components/ui/header/header.component';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { LoadingOverlayComponent } from '@app/components/ui/loading-overlay/loading-overlay.component';
import { LimitesListaDirective } from '@app/directives/limites-lista.directive';

@Component({
  selector: 'app-facturas',
  standalone: true,
  templateUrl: './facturas.page.html',
  styleUrls: ['./facturas.page.scss'],
  imports: [
    HeaderComponent,
    CurrencyPipe,
    DatePipe,
    IonButton,
    IonContent,
    IonIcon,
    SpinnerLogoComponent,
    LoadingOverlayComponent,
    LimitesListaDirective,
  ],
})
export class FacturasPage {
  private _auth = inject(Auth);
  private _factura = inject(Factura);
  private _vibracion = inject(Vibracion);
  private _toastController = inject(ToastController);

  facturas = signal<FacturaCliente[]>([]);
  cargando = signal(false);

  // ticket que se está descargando, para no pedirlo dos veces
  descargando = signal<string | null>(null);

  ionViewWillEnter(): void {
    void this.cargar();
  }

  async descargar(factura: FacturaCliente): Promise<void> {
    if (this.descargando()) {
      return;
    }

    this.descargando.set(factura.idTicket);

    try {
      await this._factura.descargar(factura.idPedido);
    } catch (error) {
      // cerrar el menú de compartir no es un error
      if (!String(error).toLowerCase().includes('cancel')) {
        void this._vibracion.error();
        await this.avisar('No pudimos descargar la factura. Intentá nuevamente.');
      }
    } finally {
      this.descargando.set(null);
    }
  }

  private async cargar(): Promise<void> {
    const usuario = this._auth.usuarioActual();

    if (!usuario) {
      return;
    }

    this.cargando.set(true);

    try {
      this.facturas.set(await this._factura.listar(usuario.id));
    } catch (error) {
      void this._vibracion.error();
      await this.avisar(error instanceof Error ? error.message : 'No pudimos cargar tus facturas.');
    } finally {
      this.cargando.set(false);
    }
  }

  private async avisar(mensaje: string): Promise<void> {
    const toast = await this._toastController.create({
      message: mensaje,
      duration: 5000,
      position: 'top',
      color: 'danger',
    });

    await toast.present();
  }
}