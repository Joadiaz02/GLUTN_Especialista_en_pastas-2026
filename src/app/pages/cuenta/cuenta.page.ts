import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { IonButton, IonContent, ToastController } from '@ionic/angular';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { Auth, Juegos, SupabaseService, Vibracion } from '@app/services';
import { CuentaCliente, Pedido } from '@app/services/pedido/pedido';
import { HeaderComponent } from '@app/components/ui/header/header.component';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';

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
  imports: [HeaderComponent, CurrencyPipe, IonButton, IonContent, SpinnerLogoComponent],
})
export class CuentaPage implements OnDestroy {
  private _auth = inject(Auth);
  private _pedido = inject(Pedido);
  private _juegos = inject(Juegos);
  private _db = inject(SupabaseService);
  private _vibracion = inject(Vibracion);
  private _router = inject(Router);
  private _toastController = inject(ToastController);

  private _canal?: RealtimeChannel;

  cuenta = signal<CuentaCliente | null>(null);
  cargando = signal(false);
  pagando = signal(false);

  // el mozo ya confirmó el pago
  propinaPorcentaje = signal<number>(10);

  pagoConfirmado = signal(false);

  lineas = computed(() => this.cuenta()?.lineas ?? []);

  propina = computed(() => this.propinaPorcentaje() ?? 0);

  subtotal = computed(() => {
    let total = 0;
    for (const linea of this.lineas()) {
      total += linea.importe;
    }
    return total;
  });

  ionViewWillEnter(): void {
    this.pagoConfirmado.set(false);
    void this.cargar();
    this.suscribir();
  }

  ionViewWillLeave(): void {
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

  // la propina se calcula sobre la cuenta ya con el descuento
  propinaImporte(): number {
    return Math.round(((this.subtotal() - this.descuentoImporte()) * this.propina()) / 100);
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