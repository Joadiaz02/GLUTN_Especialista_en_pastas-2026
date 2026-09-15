import { Component, inject } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonBackButton,
} from '@ionic/angular';
import { Router } from '@angular/router';

interface Reserva {
  id: string;
  fecha: string;
  hora: string;
  personas: number;
}

// Datos de ejemplo para mostrar la pantalla: el alta, la edición y la
// baja reales de reservas todavía no están implementadas — las arma
// otro integrante del equipo.
const RESERVAS_MOCK: Reserva[] = [
  { id: '1', fecha: '2026-09-20', hora: '21:00', personas: 4 },
  { id: '2', fecha: '2026-10-05', hora: '13:00', personas: 2 },
  { id: '3', fecha: '2026-09-10', hora: '20:30', personas: 6 },
];

@Component({
  selector: 'app-mis-reservas',
  standalone: true,
  templateUrl: './mis-reservas.page.html',
  styleUrls: ['./mis-reservas.page.scss'],
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonBackButton,
  ],
})
export class MisReservasPage {
  private _router = inject(Router);

  reservas: Reserva[] = RESERVAS_MOCK;

  esVencida(reserva: Reserva): boolean {
    return new Date(`${reserva.fecha}T${reserva.hora}`).getTime() < Date.now();
  }

  formatearFecha(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio}`;
  }

  editar(reserva: Reserva): void {
    this._router.navigate(['/reservas/nueva'], { state: { reserva } });
  }
}
