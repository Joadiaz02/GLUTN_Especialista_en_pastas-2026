import { Component, inject, signal } from '@angular/core';
import { ModalController } from '@ionic/angular';

export interface SeleccionMesaData {
  comensales: number;
  consideraciones: string;
}

@Component({
  selector: 'app-seleccion-mesa',
  standalone: true,
  templateUrl: './seleccion-mesa.component.html',
  styleUrls: ['./seleccion-mesa.component.scss'],
})
export class SeleccionMesaComponent {
  private modalController = inject(ModalController);

  comensales = signal(1);
  consideracion = signal<string | null>(null);

  ajustarComensales(delta: number): void {
    this.comensales.update((actual) =>
      Math.min(20, Math.max(1, actual + delta))
    );
  }

  seleccionarConsideracion(valor: string): void {
    this.consideracion.set(valor);
  }

  cancelar(): void {
    void this.modalController.dismiss(null, 'cancel');
  }

  confirmar(): void {
    const tipo = this.consideracion();

    if (!tipo) return;

    const seleccion: SeleccionMesaData = {
      comensales: this.comensales(),
      consideraciones: tipo,
    };

    void this.modalController.dismiss(seleccion, 'confirm');
  }
}