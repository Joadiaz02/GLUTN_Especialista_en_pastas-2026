import { inject, Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  BarcodeFormat,
  BarcodeScanner,
  GoogleBarcodeScannerModuleInstallState,
} from '@capacitor-mlkit/barcode-scanning';
import { ToastController } from '@ionic/angular';
import { CodigoQr, PORCENTAJES_PROPINA, PorcentajePropina } from '@app/models/qr.model';
import { Vibracion } from '../vibracion';

// lee los qr de la app y los interpreta
@Injectable({ providedIn: 'root' })
export class EscanerQr {
  private _toastController = inject(ToastController);
  private _vibracion = inject(Vibracion);

  async escanear(): Promise<CodigoQr | null> {
    if (!Capacitor.isNativePlatform()) {
      await this.avisar('El escáner solo está disponible en el celular.');
      return null;
    }

    try {
      if (!(await this.tienePermisoCamara())) {
        await this.avisarError('Necesitamos acceso a la cámara para escanear el código.');
        return null;
      }

      await this.asegurarModuloEscaner();

      const { barcodes } = await BarcodeScanner.scan({
        formats: [BarcodeFormat.QrCode],
      });

      // sin códigos es que cerró el escáner
      if (barcodes.length === 0) return null;

      const codigo = this.interpretar(barcodes[0].rawValue ?? '');

      if (!codigo) {
        await this.avisarError('Este código QR no pertenece a GLUTN.');
        return null;
      }

      return codigo;
    } catch {
      await this.avisarError('Ocurrió un problema al escanear. Intentá nuevamente.');
      return null;
    }
  }

  interpretar(texto: string): CodigoQr | null {
    let datos: unknown;

    try {
      datos = JSON.parse(texto);
    } catch {
      return null;
    }

    if (typeof datos !== 'object' || datos === null) return null;

    const qr = datos as Record<string, unknown>;

    switch (qr['tipo']) {
      case 'ingreso':
        return { tipo: 'ingreso' };

      case 'mesa':
        return typeof qr['id'] === 'string' && qr['id'] !== ''
          ? { tipo: 'mesa', id: qr['id'] }
          : null;

      case 'propina':
        return PORCENTAJES_PROPINA.includes(qr['porcentaje'] as PorcentajePropina)
          ? { tipo: 'propina', porcentaje: qr['porcentaje'] as PorcentajePropina }
          : null;

      default:
        return null;
    }
  }

  private async tienePermisoCamara(): Promise<boolean> {
    const permiso = await BarcodeScanner.checkPermissions();
    if (permiso.camera === 'granted') return true;

    const pedido = await BarcodeScanner.requestPermissions();
    return pedido.camera === 'granted';
  }

  // en android espera a que se instale el escáner
  private async asegurarModuloEscaner(): Promise<void> {
    if (Capacitor.getPlatform() !== 'android') return;

    const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
    if (available) return;

    await this.avisar('Preparando el escáner, esperá unos segundos...');

    await new Promise<void>((resolve, reject) => {
      void BarcodeScanner.addListener('googleBarcodeScannerModuleInstallProgress', (evento) => {
        if (evento.state === GoogleBarcodeScannerModuleInstallState.COMPLETED) {
          resolve();
        } else if (
          evento.state === GoogleBarcodeScannerModuleInstallState.FAILED ||
          evento.state === GoogleBarcodeScannerModuleInstallState.CANCELED
        ) {
          reject(new Error('No se pudo instalar el escáner'));
        }
      }).then((listener) => {
        void BarcodeScanner.installGoogleBarcodeScannerModule().catch(reject);
        return listener;
      });
    }).finally(() => void BarcodeScanner.removeAllListeners());
  }

  private async avisarError(mensaje: string): Promise<void> {
    void this._vibracion.error();
    await this.avisar(mensaje, 'danger');
  }

  private async avisar(mensaje: string, color = 'primary'): Promise<void> {
    const toast = await this._toastController.create({
      message: mensaje,
      duration: 3000,
      position: 'top',
      color,
    });
    await toast.present();
  }
}
