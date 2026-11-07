import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonModal, ToastController } from '@ionic/angular';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { ListaEncajadaDirective } from '@app/directives/lista-encajada.directive';
import { Auth, Juegos, SupabaseService, Vibracion } from '@app/services';
import { CuentaCliente, Pedido } from '@app/services/pedido/pedido';
import { HeaderComponent } from '@app/components/ui/header/header.component';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { LoadingOverlayComponent } from '@app/components/ui/loading-overlay/loading-overlay.component';
import { Propina } from '@app/services/propina/propina';
import { Factura } from '@app/services/factura/factura';

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
  imports: [HeaderComponent, CurrencyPipe, IonButton, IonContent, IonModal, SpinnerLogoComponent, LoadingOverlayComponent, ListaEncajadaDirective],
})
export class CuentaPage implements OnDestroy {
  private _auth = inject(Auth);
  private _pedido = inject(Pedido);
  private _juegos = inject(Juegos);
  private _db = inject(SupabaseService);
  private _vibracion = inject(Vibracion);
  private _router = inject(Router);
  private _toastController = inject(ToastController);

  private _propinaService = inject(Propina);
  private _factura = inject(Factura);

  private _canal?: RealtimeChannel;

  cuenta = signal<CuentaCliente | null>(null);
  cargando = signal(false);
  pagando = signal(false);

  // el mozo ya confirmó el pago ACA ESTA EL ERRORRRR LOCALIZADO
  propinaPorcentaje = signal<number>(10);

  pagoConfirmado = signal(false);

  // pedido del pago confirmado; con él se pide la factura
  idPedidoPagado = signal<string | null>(null);
  descargandoFactura = signal(false);

  lineas = computed(() => this.cuenta()?.lineas ?? []);

  propina = computed(() => {
    const propinaEnPorcentaje = this._propinaService.propinaActual();

    return propinaEnPorcentaje ?? 0
    // return this.propinaPorcentaje() ?? 0
  });

  subtotal = computed(() => {
    let total = 0;
    for (const linea of this.lineas()) {
      total += linea.importe;
    }
    return total;
  });

  ionViewWillEnter(): void {
    this.pagoConfirmado.set(false);
    this.idPedidoPagado.set(null);
    void this.cargar();
    this.suscribir();
  }

  ionViewWillLeave(): void {
    // el modal de pago confirmado no debe quedar abierto en la pantalla siguiente
    this.pagoConfirmado.set(false);
    this.dejarDeEscuchar();
  }

  ngOnDestroy(): void {
    this.dejarDeEscuchar();
  }

  descuentoPorcentaje(): number {
    return this._juegos.descuentoActual() ?? 0;
  }

  descuentoImporte(): number {
    return Math.round((this.subtotal() * this.descuentoPorcentaje()) / 100);
  }

  // la propina se calcula sobre el subtotal, igual que en la factura
  propinaImporte(): number {
    return Math.round((this.subtotal() * this.propina()) / 100);
  }

  total(): number {
    return this.subtotal() - this.descuentoImporte() + this.propinaImporte();
  }

  nivelPropina(): string {
    return NIVEL_PROPINA[this.propina()] ?? '';
  }

  async pagar(): Promise<void> {
    const cuenta = this.cuenta();

    if (!cuenta || this.pagando()) {
      return;
    }

    this.pagando.set(true);

    console.log("cuenta.page.ts 103 | CUENTAAAAAAAAAAA PROPINAAAAAAAAAAAA")
    console.log(this.propinaImporte())
    console.log("cuenta.page.ts 103 | CUENTAAAAAAAAAAA PROPINAAAAAAAAAAAA")

    try {
      await this._pedido.pagarCuenta({
        idMesa: cuenta.idMesa,
        idsPedidos: cuenta.idsPedidos,
        propinaImporte: this.propinaImporte(),
        totalFinal: this.total(),
      });

      await this.avisar('Pago enviado. Esperando la confirmación del mozo.', 'success');
      await this.cargar();
    } catch (error) {
      void this._vibracion.error();
      await this.avisar(
        error instanceof Error ? error.message : 'No pudimos registrar el pago.',
        'danger'
      );
    } finally {
      this.pagando.set(false);
    }
  }

  irAlInicio(): void {
    void this._router.navigate(['/home']);
  }

  async descargarFactura(): Promise<void> {
    const idPedido = this.idPedidoPagado();

    if (!idPedido || this.descargandoFactura()) {
      return;
    }

    this.descargandoFactura.set(true);

    try {
      await this._factura.descargar(idPedido);
    } catch (error) {
      // cerrar el menú de compartir no es un error
      if (!String(error).toLowerCase().includes('cancel')) {
        void this._vibracion.error();
        await this.avisar('No pudimos descargar la factura. Intentá nuevamente.', 'danger');
      }
    } finally {
      this.descargandoFactura.set(false);
    }
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);

    try {
      const usuario = this._auth.usuarioActual();

      if (!usuario) {
        return;
      }

      await this._juegos.cargar();
      this.cuenta.set(await this._pedido.obtenerCuenta(usuario.id));
    } catch (error) {
      void this._vibracion.error();
      await this.avisar(
        error instanceof Error ? error.message : 'No pudimos cargar tu cuenta.',
        'danger'
      );
    } finally {
      this.cargando.set(false);
    }
  }

  // se entera cuando el mozo confirma el pago
  private suscribir(): void {
    this.dejarDeEscuchar();

    const usuario = this._auth.usuarioActual();

    if (!usuario) {
      return;
    }

    this._canal = this._db.client
      .channel(`cuenta-${usuario.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pedido',
          filter: `id_usuario=eq.${usuario.id}`,
        },
        (payload) => {
          if (payload.new['estado_pedido'] === 'pagado') {
            this.idPedidoPagado.set(payload.new['id_pedido'] ?? null);
            this.pagoConfirmado.set(true);
            this.cuenta.set(null);
            return;
          }

          void this.cargar();
        }
      )
      .subscribe();
  }

  private dejarDeEscuchar(): void {
    if (this._canal) {
      void this._db.client.removeChannel(this._canal);
      this._canal = undefined;
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
}