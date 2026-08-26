import { Component } from '@angular/core';
import {
  IonContent,
  IonButton,
  IonList,
  IonListHeader,
  IonItem,
  IonThumbnail,
  IonLabel,
  IonDatetime,
  IonIcon,
  IonTabs,
  IonTabBar,
  IonTabButton
} from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  imports: [
    IonContent,
    IonButton,
    IonList,
    //IonListHeader,
    IonItem,
    IonThumbnail,
    IonLabel,
    IonDatetime,
    IonIcon,
    IonTabs,
    IonTabBar,
    IonTabButton
  ],
})
export class HomePage {

  // ============================
  // ESTADOS
  // ============================

  isLoggedIn = false;       // login / logout
  enMesa = false;           // habilita sala de chat

  showReserva = false;
  showDestacados = false;
  showQuienesSomos = false;

  // ============================
  // FECHA Y HORA
  // ============================

  today = new Date().toISOString().split('T')[0];
  now = new Date().toISOString();

  fecha: string = '';
  hora: string = '';

  // ============================
  // PRODUCTOS (simulado)
  // ============================

  productos = [
    { nombre: 'Ravioles', imagen: 'assets/icons/ravioles.png', detalle: 'Clásicos y especiales' },
    { nombre: 'Sorrentinos', imagen: 'assets/icons/sorrentinos.png', detalle: 'Jamón y queso, calabaza' },
    { nombre: 'Fideos', imagen: 'assets/icons/fideos.png', detalle: 'Spaghetti, tallarines' }
  ];

  constructor(private router: Router) {}

  // ============================
  // LOGIN / LOGOUT
  // ============================

  onLoginClick() {
    if (this.isLoggedIn) {
      this.isLoggedIn = false;
      this.enMesa = false;
      localStorage.removeItem('token');
      localStorage.removeItem('mesa');
    } else {
      this.router.navigate(['/login']);
    }
  }

  // ============================
  // BOTONES PRINCIPALES
  // ============================

  toggleReserva() {
    this.showReserva = !this.showReserva;
    this.showDestacados = false;
    this.showQuienesSomos = false;
  }

  toggleDestacados() {
    this.showDestacados = !this.showDestacados;
    this.showReserva = false;
    this.showQuienesSomos = false;
  }

  toggleQuienesSomos() {
    this.showQuienesSomos = !this.showQuienesSomos;
    this.showReserva = false;
    this.showDestacados = false;
  }

  // ============================
  // NAVEGACIONES
  // ============================

  goToCarta() {
    this.router.navigate(['/carta']);
  }

  goToChat() {
    if (this.enMesa) {
      this.router.navigate(['/chat']);
    }
  }

  goToEncuestas() {
    this.router.navigate(['/encuestas']);
  }

  goToScanner() {
    this.router.navigate(['/scanner']);
  }

  // ============================
  // RESERVA
  // ============================

  solicitarReserva() {
    console.log('Reserva solicitada:', this.fecha, this.hora);

    // Simulación: al reservar, el cliente queda "en mesa"
    this.enMesa = true;
    localStorage.setItem('mesa', 'true');

    alert('Reserva enviada correctamente');
  }

  formatDate(value: string | string[] | null | undefined): string {
  if (!value) return '';
  if (Array.isArray(value)) return value[0] ?? '';
  return value;
  }

}
