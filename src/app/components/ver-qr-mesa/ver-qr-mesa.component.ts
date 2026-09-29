import { Component, Input, OnInit, ViewChild, ElementRef, AfterViewInit, Inject } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import * as QRCode from 'qrcode';
import { Vibracion } from '@app/services';
import { inject } from 'vitest';
@Component({
  selector: 'app-ver-qr-mesa',
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar],
  template: `
    <ion-header><ion-toolbar><ion-title>QR Mesa {{ numero }}</ion-title></ion-toolbar></ion-header>
    <ion-content class="ion-padding ion-text-center">
      <canvas #qrCanvas></canvas>
    </ion-content>
  `,
  
})


export class VerQrMesaComponent implements AfterViewInit {
  @Input({ required: true }) mesaId!: string;
  @Input({ required: true }) numero!: string;
  @ViewChild('qrCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private _vibracion = Inject(Vibracion);

  async ngAfterViewInit() {
    try {
      const payload = JSON.stringify({ tipo: 'mesa', id: this.mesaId });
      await QRCode.toCanvas(this.canvasRef.nativeElement, payload, { width: 260 });
    } catch (err) {
      await this._vibracion.error();
      console.error('Error generando QR:', err);
    }
  }
}