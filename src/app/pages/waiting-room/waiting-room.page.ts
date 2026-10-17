import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { Router } from '@angular/router';
import { Auth, PushNotificationService, SupabaseService, Vibracion, Waitlist } from '@app/services';
import { TurnRingComponent } from '@app/components';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

@Component({
  selector: 'app-waiting-room',
  templateUrl: './waiting-room.page.html',
  styleUrls: ['./waiting-room.page.scss'],
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonButton,
    TurnRingComponent,
  ],
})
export class WaitingRoomPage {
  private _router = inject(Router);

  private _authService = inject(Auth);

  private _waitlistService = inject(Waitlist);

  private _pushNotificationService = inject(PushNotificationService);

  private _toastController = inject(ToastController);

  private readonly vibracion = inject(Vibracion);

  private readonly _supabase = inject(SupabaseService);

  position = signal<number | null>(null);

  total = signal<number>(1);

  loading = signal(true);

  isTableAssigned = signal(false);

  table = signal<any | null>(null);
  private _unsubscribe: (() => void) | null = null;

  private _userId = '';

  async ngOnInit(): Promise<void> {
    const user = await this._authService.obtenerUsuarioActual();

    if (!user?.id) {
      await this._router.navigate(['/login']);

      return;
    }

    this._userId = user.id;

    try {
      await this._pushNotificationService.inicializar();
    } catch (error) {
      console.warn('No se pudo inicializar Push Notifications:', error);
    }

    await this._refrescar();

    this.loading.set(false);

    this._unsubscribe = this._waitlistService.subscribeToChanges(() => {
      void this._refrescar();
    });
  }

  ngOnDestroy(): void {
    this._unsubscribe?.();
  }

  async scanQR(): Promise<void> {
    const { camera } = await BarcodeScanner.requestPermissions();

    if (camera !== 'granted' && camera !== 'limited') {
      await this._showError(
        'Necesitamos permiso de cámara para escanear el código.'
      );

      await this.vibracion.error();

      return;
    }

    const { barcodes } = await BarcodeScanner.scan();

    if (barcodes.length === 0) {
      return;
    }

    const valueBarcode = barcodes[0].rawValue as string;

    try {
      const result = await this._waitlistService.linkTable(
        this._userId,
        valueBarcode
      );

      if (result.ok) {
        await this._router.navigateByUrl('/carta', {
          replaceUrl: true,
        });

        return;
      }

      if (result.reason === 'wrong_table') {
        await this._showError(
          `Esta no es tu mesa. Tenés asignada la mesa ${result.correctTableNumber}.`
        );

        await this.vibracion.error();

        return;
      }

      if (result.reason === 'no_table_assigned') {
        await this._showError('Todavía no tenés una mesa asignada.');

        await this.vibracion.error();

        return;
      }

      if (result.reason === 'invalid_qr') {
        await this._showError('El código QR no corresponde a una mesa válida.');

        await this.vibracion.error();

        return;
      }

      await this._showError('No pudimos validar la mesa.');

      await this.vibracion.error();
    } catch (error) {
      console.error('Error vinculando mesa:', error);

      await this._showError('No pudimos validar la mesa. Intentá nuevamente.');

      await this.vibracion.error();
    }
  }

  irAEncuestas(): void {
    void this._router.navigate(['/encuestas']);
  }

  private async _refrescar(): Promise<void> {
    if (!this._userId) {
      return;
    }

    try {
      const miEntrada = await this._waitlistService.getMyEntry(this._userId);

      if (miEntrada?.estado === 'asignado' && miEntrada.mesa_id) {
        const mesa = await this._waitlistService.getTableById(
          miEntrada.mesa_id
        );

        this.isTableAssigned.set(true);

        this.table.set(mesa);

        return;
      }

      this.isTableAssigned.set(false);

      this.table.set(null);

      const [position, listaCompleta] = await Promise.all([
        this._waitlistService.getPosition(this._userId),
        this._waitlistService.getList(),
      ]);

      this.position.set(position);

      this.total.set(Math.max(listaCompleta.length, 1));
    } catch (error) {
      console.error('Error actualizando sala de espera:', error);

      await this.vibracion.error();
    }
  }

  private async _showError(mensaje: string): Promise<void> {
    const toast = await this._toastController.create({
      message: mensaje,
      duration: 3000,
      position: 'top',
      color: 'danger',
    });

    await toast.present();
  }
}
