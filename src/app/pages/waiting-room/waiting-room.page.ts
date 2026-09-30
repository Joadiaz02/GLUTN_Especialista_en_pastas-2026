import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonHeader, IonTitle, IonToolbar, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Auth, Waitlist } from '@app/services';
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
    TurnRingComponent
],
})
export class WaitingRoomPage {
  private _router = inject(Router);
  private _authService = inject(Auth);
  private _waitlistService = inject(Waitlist);
  private _toastController = inject(ToastController);

  position = signal<number | null>(null);
  total = signal<number>(1);

  isTableAssigned = signal(false)
  table = signal<any>(null)
  
  private _unsubscribe: (() => void) | null = null;
  private _userId = '';

  async ngOnInit() {
    const user = await this._authService.obtenerUsuarioActual();
    this._userId = user.id;

    await this._refrescar();
    this._unsubscribe = this._waitlistService.subscribeToChanges(() => this._refrescar());
  }

  ngOnDestroy() {
    this._unsubscribe?.();
  }

  async scanQR() {
    const { camera } = await BarcodeScanner.requestPermissions();

    if (camera !== 'granted' && camera !== 'limited') {
      await this._showError('Necesitamos permiso de cámara para escanear el código.');
    
      return;
    }

    const { barcodes } = await BarcodeScanner.scan();
    
    if (barcodes.length === 0) return;

    console.log("waiting-room.page.ts 65")
    console.log(barcodes)

    const valueBarcode = barcodes[0].rawValue as string;

    console.log("waiting-room.page.ts 76")
    console.log(valueBarcode)
    
    const result = await this._waitlistService.linkTable(this._userId, valueBarcode);
    
    console.log("waiting-room.page.ts 81")
    console.log(result)

    if (result.ok) {
      await this._router.navigateByUrl('/carta', { replaceUrl: true });
      
      return;
    }
  }

  private async _refrescar(): Promise<void> {
    const miEntrada = await this._waitlistService.getMyEntry(this._userId);

    if (miEntrada?.estado === 'asignado' && miEntrada.mesa_id) {
      const mesa = await this._waitlistService.getTableById(miEntrada.mesa_id);

      this.isTableAssigned.set(true)

      this.table.set(mesa)


      console.log("qjkwehqwkjehqwkjeh")
      console.log(mesa)

      return;
    }

    const [position, listaCompleta] = await Promise.all([
      this._waitlistService.getPosition(this._userId),
      this._waitlistService.getList(),
    ]);

    this.position.set(position);
    this.total.set(Math.max(listaCompleta.length, 1));
  }

  private async _showError(mensaje: string): Promise<void> {
    const toast = await this._toastController.create({
      message: mensaje, duration: 3000, position: 'top', color: 'danger',
    });
    await toast.present();
  }
}
