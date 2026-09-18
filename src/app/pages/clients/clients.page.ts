import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonToolbar,
} from '@ionic/angular';
import { Router } from '@angular/router';

import { ClientsService } from '@app/services/clients/clients.service';
import { Usuario } from '@app/models/usuario.model';

import { ClientCardComponent } from './components/client-card/client-card.component';
import { ClientsNavigationComponent } from './components/clients-navigation/clients-navigation.component';
import { RejectClientModalComponent } from './components/reject-client-modal/reject-client-modal.component';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    ClientCardComponent,
    ClientsNavigationComponent,
    RejectClientModalComponent,
  ],
  templateUrl: './clients.page.html',
  styleUrls: ['./clients.page.scss'],
})
export class ClientsPage implements OnInit {
  private readonly clientsService =
    inject(ClientsService);

  private readonly router =
    inject(Router);

  clientesPendientes =
    signal<Usuario[]>([]);

  cargando =
    signal(false);

  indiceActual =
    signal(0);

  procesandoCliente =
    signal(false);

  mostrarModalRechazo =
    signal(false);

  motivoRechazo =
    signal('');

  clienteARechazar =
    signal<Usuario | null>(null);

  tarjetaSaliendo =
    signal(false);

  private touchStartX = 0;
  private touchEndX = 0;

  ngOnInit(): void {
    void this.cargarClientesPendientes();
  }

  get totalClientes(): number {
    return this.clientesPendientes().length;
  }

  get posicionVisible(): number {
    return this.totalClientes === 0
      ? 0
      : this.indiceActual() + 1;
  }

  async cargarClientesPendientes(): Promise<void> {
    if (this.cargando()) {
      return;
    }

    this.cargando.set(true);

    try {
      const clientes =
        await this.clientsService.obtenerClientesPendientes();

      this.clientesPendientes.set(clientes);

      if (clientes.length === 0) {
        this.indiceActual.set(0);
      } else if (
        this.indiceActual() >= clientes.length
      ) {
        this.indiceActual.set(
          clientes.length - 1
        );
      }
    } catch (error) {
      console.error(
        'Error al cargar clientes pendientes:',
        error
      );

      this.mostrarToast(
        'No se pudieron cargar los clientes pendientes.'
      );
    } finally {
      this.cargando.set(false);
    }
  }

  obtenerAvatarUrl(
    avatar: string | null | undefined
  ): string | null {
    return this.clientsService.obtenerAvatarUrl(
      avatar
    );
  }

  obtenerPosicionCarta(
    indice: number
  ): number {
    const total =
      this.clientesPendientes().length;

    if (total === 0) {
      return 0;
    }

    let posicion =
      indice - this.indiceActual();

    if (posicion > total / 2) {
      posicion -= total;
    }

    if (posicion < -total / 2) {
      posicion += total;
    }

    return posicion;
  }

  obtenerPosicion(
    indice: number
  ): number {
    return this.obtenerPosicionCarta(indice);
  }

obtenerClaseCarta(
  indice: number
): 'activa' | 'anterior' | 'siguiente' | 'oculta' {
  const posicion =
    this.obtenerPosicionCarta(indice);

  if (posicion === 0) {
    return 'activa';
  }

  if (posicion === -1) {
    return 'anterior';
  }

  if (posicion === 1) {
    return 'siguiente';
  }

  return 'oculta';
}

  irAnterior(): void {
    if (this.procesandoCliente()) {
      return;
    }

    const total =
      this.clientesPendientes().length;

    if (total <= 1) {
      return;
    }

    const nuevoIndice =
      this.indiceActual() - 1;

    if (nuevoIndice < 0) {
      this.indiceActual.set(
        total - 1
      );
      return;
    }

    this.indiceActual.set(
      nuevoIndice
    );
  }

  irSiguiente(): void {
    if (this.procesandoCliente()) {
      return;
    }

    const total =
      this.clientesPendientes().length;

    if (total <= 1) {
      return;
    }

    const nuevoIndice =
      this.indiceActual() + 1;

    if (nuevoIndice >= total) {
      this.indiceActual.set(0);
      return;
    }

    this.indiceActual.set(
      nuevoIndice
    );
  }

  onTouchStart(
  event: TouchEvent
): void {
  if (this.procesandoCliente()) {
    return;
  }

  this.touchStartX =
    event.changedTouches[0]?.screenX ?? 0;

  this.touchEndX =
    this.touchStartX;
}

onTouchMove(
  event: TouchEvent
): void {
  if (this.procesandoCliente()) {
    return;
  }

  this.touchEndX =
    event.changedTouches[0]?.screenX ??
    this.touchEndX;
}

onTouchEnd(
  event: TouchEvent
): void {
  if (this.procesandoCliente()) {
    return;
  }

  this.touchEndX =
    event.changedTouches[0]?.screenX ??
    this.touchEndX;

  this.procesarSwipe();
}

  private procesarSwipe(): void {
    const distancia =
      this.touchEndX -
      this.touchStartX;

    if (Math.abs(distancia) < 50) {
      return;
    }

    if (distancia > 0) {
      this.irAnterior();
    } else {
      this.irSiguiente();
    }
  }

  async aprobarCliente(
    cliente: Usuario
  ): Promise<void> {
    if (this.procesandoCliente()) {
      return;
    }

    this.procesandoCliente.set(true);

    let emailEnviado = true;

    try {
      await this.clientsService.aprobarCliente(
        cliente.id
      );

      try {
        await this.clientsService.notificarEstadoCliente(
          cliente.id,
          'aprobado'
        );
      } catch (error) {
        console.error(
          'Cliente aprobado, pero no se pudo enviar el email:',
          error
        );

        emailEnviado = false;
      }

      this.animarSalida(cliente);

      if (!emailEnviado) {
        this.mostrarToast(
          'Cliente aprobado, pero no pudimos enviar el email.'
        );
      }
    } catch (error) {
      console.error(
        'Error al aprobar cliente:',
        error
      );

      this.procesandoCliente.set(false);

      this.mostrarToast(
        'No se pudo aprobar el cliente.'
      );
    }
  }

  abrirRechazo(
    cliente: Usuario
  ): void {
    if (this.procesandoCliente()) {
      return;
    }

    this.clienteARechazar.set(cliente);
    this.motivoRechazo.set('');
    this.mostrarModalRechazo.set(true);
  }

  cerrarModalRechazo(): void {
    if (this.procesandoCliente()) {
      return;
    }

    this.mostrarModalRechazo.set(false);
    this.clienteARechazar.set(null);
    this.motivoRechazo.set('');
  }

  actualizarMotivo(
    motivo: string
  ): void {
    this.motivoRechazo.set(motivo);
  }

  async confirmarRechazo(
    motivo: string
  ): Promise<void> {
    const cliente =
      this.clienteARechazar();

    if (
      !cliente ||
      !motivo.trim() ||
      this.procesandoCliente()
    ) {
      return;
    }

    this.mostrarModalRechazo.set(false);
    this.procesandoCliente.set(true);

    let emailEnviado = true;

    try {
      await this.clientsService.rechazarCliente(
        cliente.id,
        motivo.trim()
      );

      try {
        await this.clientsService.notificarEstadoCliente(
          cliente.id,
          'rechazado',
          motivo.trim()
        );
      } catch (error) {
        console.error(
          'Cliente rechazado, pero no se pudo enviar el email:',
          error
        );

        emailEnviado = false;
      }

      this.clienteARechazar.set(null);
      this.motivoRechazo.set('');

      this.animarSalida(cliente);

      if (!emailEnviado) {
        this.mostrarToast(
          'Cliente rechazado, pero no pudimos enviar el email.'
        );
      }
    } catch (error) {
      console.error(
        'Error al rechazar cliente:',
        error
      );

      this.procesandoCliente.set(false);
      this.mostrarModalRechazo.set(true);

      this.mostrarToast(
        'No se pudo rechazar el cliente.'
      );
    }
  }

  private animarSalida(
    cliente: Usuario
  ): void {
    const clientes =
      this.clientesPendientes();

    const indice =
      clientes.findIndex(
        item => item.id === cliente.id
      );

    if (indice === -1) {
      this.procesandoCliente.set(false);
      return;
    }

    if (
      indice === this.indiceActual()
    ) {
      this.tarjetaSaliendo.set(true);

      setTimeout(() => {
        this.eliminarClienteVisualmente(
          indice
        );
      }, 300);

      return;
    }

    this.eliminarClienteVisualmente(
      indice
    );
  }

  private eliminarClienteVisualmente(
    indice: number
  ): void {
    const clientes = [
      ...this.clientesPendientes(),
    ];

    clientes.splice(indice, 1);

    this.clientesPendientes.set(
      clientes
    );

    this.tarjetaSaliendo.set(false);

    if (clientes.length === 0) {
      this.indiceActual.set(0);
    } else if (
      this.indiceActual() >= clientes.length
    ) {
      this.indiceActual.set(
        clientes.length - 1
      );
    }

    this.procesandoCliente.set(false);
  }

  volver(): void {
    void this.router.navigateByUrl(
      '/admin'
    );
  }

  private async mostrarToast(
    mensaje: string
  ): Promise<void> {
    const toast =
      document.createElement('ion-toast');

    toast.message = mensaje;
    toast.duration = 3000;
    toast.position = 'bottom';

    document.body.appendChild(toast);

    await toast.present();
  }
}