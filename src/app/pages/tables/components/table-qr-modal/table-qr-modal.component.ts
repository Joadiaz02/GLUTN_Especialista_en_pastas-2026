// table-qr-modal.component.ts
import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { IonButton, IonContent, ToastController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import * as QRCode from 'qrcode';
// import { buildTableQrContent } from '@app/utils/qr.utils';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { buildTableQrContent } from '@app/utils';

@Component({
  selector: 'app-table-qr-modal',
  templateUrl: './table-qr-modal.component.html',
  styleUrls: ['./table-qr-modal.component.scss'],
  imports: [IonContent, IonButton, SpinnerLogoComponent],
})
export class TableQrModalComponent implements OnInit {
  private _toastController = inject(ToastController);

  @Input({ required: true }) table!: { id: string; numero: number };

  qrDataUrl = signal<string | null>(null);
  isDownloading = signal(false);

  async ngOnInit(): Promise<void> {
    const dataUrl = await QRCode.toDataURL(buildTableQrContent(this.table.id), {
      width: 800,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#FFFFFF' },
    });
    this.qrDataUrl.set(dataUrl);
  }

  async download(): Promise<void> {
    const dataUrl = this.qrDataUrl();
    if (!dataUrl) return;

    const fileName = `mesa-${this.table.numero}-qr.png`;
    this.isDownloading.set(true);

    try {
      if (Capacitor.isNativePlatform()) {
        const base64 = dataUrl.split(',')[1];

        const { uri } = await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Cache,
        });

        await Share.share({
          title: `QR de la mesa N° ${this.table.numero}`,
          url: uri,
          dialogTitle: 'Guardar código QR',
        });
      } else {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = fileName;
        link.click();
      }
    } catch (error) {
      if (!String(error).toLowerCase().includes('cancel')) {
        const toast = await this._toastController.create({
          message: 'No pudimos descargar el código QR. Intentá nuevamente.',
          duration: 4000,
          position: 'top',
          color: 'danger',
        });
        await toast.present();
      }
    } finally {
      this.isDownloading.set(false);
    }
  }
}