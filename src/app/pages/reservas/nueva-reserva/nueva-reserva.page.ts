import { Component, inject, OnInit } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonItem,
  IonLabel,
  IonDatetime,
  IonButton,
  ToastController,
} from '@ionic/angular';
import { Router } from '@angular/router';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';

interface ReservaEnEdicion {
  id: string;
  fecha: string;
  hora: string;
}

@Component({
  selector: 'app-nueva-reserva',
  standalone: true,
  templateUrl: './nueva-reserva.page.html',
  styleUrls: ['./nueva-reserva.page.scss'],
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonItem,
    IonLabel,
    IonDatetime,
    IonButton,
    ConfirmVolverComponent,
  ],
})
export class NuevaReservaPage implements OnInit {
  private _router = inject(Router);
  private _toastController = inject(ToastController);

  private _reservaEnEdicion: ReservaEnEdicion | null = null;

  today = new Date().toISOString().split('T')[0];
  maxDate: string;

  fecha = '';
  hora = '';

  constructor() {
    const proximoMes = new Date();
    proximoMes.setMonth(proximoMes.getMonth() + 1);
    this.maxDate = proximoMes.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    const reserva = history.state?.reserva as ReservaEnEdicion | undefined;

    if (reserva) {
      this._reservaEnEdicion = reserva;
      this.fecha = reserva.fecha;
      this.hora = reserva.hora;
    }
  }

  get modoEdicion(): boolean {
    return this._reservaEnEdicion !== null;
  }

  tituloPagina(): string {
    return this.modoEdicion ? 'Editar reserva' : 'Nueva reserva';
  }

  textoBoton(): string {
    return this.modoEdicion ? 'Guardar cambios' : 'Confirmar reserva';
  }

  formatDate(value: string | string[] | null | undefined): string {
    if (!value) return '';
    if (Array.isArray(value)) return value[0] ?? '';
    return value;
  }

  // por ahora solo valida que estén los datos
  async confirmar(): Promise<void> {
    if (!this.fecha || !this.hora) {
      const toastError = await this._toastController.create({
        message: 'Por favor seleccioná fecha y hora para la reserva.',
        duration: 3000,
        position: 'top',
        color: 'danger',
      });
      await toastError.present();
      return;
    }

    const toast = await this._toastController.create({
      message: this.modoEdicion
        ? 'Pronto vas a poder guardar los cambios de tu reserva desde acá.'
        : 'Pronto vas a poder confirmar tu reserva desde acá.',
      duration: 3000,
      position: 'top',
      color: 'primary',
    });
    await toast.present();
  }

  volver(): void {
    this._router.navigate(['/reservas']);
  }
}
