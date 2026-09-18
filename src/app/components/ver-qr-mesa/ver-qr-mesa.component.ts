import { Component, Input, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import * as QRCode from 'qrcode';

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

  async ngAfterViewInit() {
    try {
      const payload = JSON.stringify({ tipo: 'mesa', id: this.mesaId });
      await QRCode.toCanvas(this.canvasRef.nativeElement, payload, { width: 260 });
    } catch (err) {
      console.error('Error generando QR:', err);
    }
  }
}