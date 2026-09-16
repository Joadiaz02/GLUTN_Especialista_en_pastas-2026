import {
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonTitle,
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
  templateUrl: './clients.page.html',
  styleUrls: ['./clients.page.scss'],
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonIcon,
    IonSpinner,
    ClientCardComponent,
    ClientsNavigationComponent,
    RejectClientModalComponent,
  ],
})
export class ClientsPage
  implements OnInit, OnDestroy {

  clientesPendientes =
    signal<Usuario[]>([]);

  cargando =
    signal<boolean>(false);

  indiceActual =
    signal<number>(0);

  procesandoCliente =
    signal<boolean>(false);

  mostrarModalRechazo =
    signal<boolean>(false);

  motivoRechazo =
    signal<string>('');

  clienteARechazar =
    signal<Usuario | null>(null);

  tarjetaSaliendo =
    signal<boolean>(false);

  private intervaloActualizacion:
    ReturnType<typeof setInterval> | null = null;

  private touchStartX = 0;
  private touchCurrentX = 0;
  private isDragging = false;

  private readonly clientsService =
    inject(ClientsService);

  private readonly router =
    inject(Router);


  async ngOnInit(): Promise<void> {
    await this.cargarClientesPendientes(true);

    this.iniciarActualizacionAutomatica();
  }


  ngOnDestroy(): void {
    this.detenerActualizacionAutomatica();
  }


  /* =====================================
     CLIENTES
     ===================================== */

  async cargarClientesPendientes(
    mostrarSpinner = true
  ): Promise<void> {

    if (mostrarSpinner) {
      this.cargando.set(true);
    }

    try {

      const clientesAntes =
        this.clientesPendientes();

      const clienteVisible =
        clientesAntes[
          this.indiceActual()
        ];

      const clientes =
        await this.clientsService
          .obtenerClientesPendientes();

     this.clientesPendientes.set(clientes);

      if (clientes.length === 0) {
        this.indiceActual.set(0);
        return;
      }

      if (clienteVisible) {

        const nuevoIndice =
          clientes.findIndex(
            cliente =>
              cliente.id ===
              clienteVisible.id
          );

        if (nuevoIndice !== -1) {
          this.indiceActual.set(
            nuevoIndice
          );

          return;
        }
      }

      if (
        this.indiceActual() >=
        clientes.length
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

    } finally {

      if (mostrarSpinner) {
        this.cargando.set(false);
      }

    }
  }


  private iniciarActualizacionAutomatica(): void {

    this.detenerActualizacionAutomatica();

    this.intervaloActualizacion =
      setInterval(() => {

        if (
          this.procesandoCliente() ||
          this.mostrarModalRechazo()
        ) {
          return;
        }

        void this.cargarClientesPendientes(false);

      }, 5000);
  }


  private detenerActualizacionAutomatica(): void {

    if (
      this.intervaloActualizacion !== null
    ) {

      clearInterval(
        this.intervaloActualizacion
      );

      this.intervaloActualizacion = null;
    }
  }


  get totalClientes(): number {
    return this.clientesPendientes().length;
  }


  get posicionVisible(): number {

    if (this.totalClientes === 0) {
      return 0;
    }

    return this.indiceActual() + 1;
  }


  obtenerAvatarUrl(
    avatar: string | null | undefined
  ): string | null {

    return this.clientsService
      .obtenerAvatarUrl(avatar);
  }


  /* =====================================
     CARRUSEL
     ===================================== */

  obtenerPosicionCarta(
    indice: number
  ): number {

    const actual =
      this.indiceActual();

    let diferencia =
      indice - actual;

    const total =
      this.totalClientes;

    if (total > 2) {

      if (
        diferencia >
        total / 2
      ) {
        diferencia -= total;
      }

      if (
        diferencia <
        -total / 2
      ) {
        diferencia += total;
      }
    }

    return diferencia;
  }


  obtenerPosicion(
    indice: number
  ):
    'activa'
    | 'anterior'
    | 'siguiente'
    | 'oculta' {

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

    if (
      this.totalClientes <= 1 ||
      this.procesandoCliente()
    ) {
      return;
    }

    const actual =
      this.indiceActual();

    this.indiceActual.set(
      actual === 0
        ? this.totalClientes - 1
        : actual - 1
    );
  }


  irSiguiente(): void {

    if (
      this.totalClientes <= 1 ||
      this.procesandoCliente()
    ) {
      return;
    }

    const actual =
      this.indiceActual();

    this.indiceActual.set(
      actual === this.totalClientes - 1
        ? 0
        : actual + 1
    );
  }


  /* =====================================
     SWIPE
     ===================================== */

  onTouchStart(
    event: TouchEvent
  ): void {

    if (
      this.procesandoCliente()
    ) {
      return;
    }

    this.touchStartX =
      event.touches[0].clientX;

    this.touchCurrentX =
      this.touchStartX;

    this.isDragging = true;
  }


  onTouchMove(
    event: TouchEvent
  ): void {

    if (!this.isDragging) {
      return;
    }

    this.touchCurrentX =
      event.touches[0].clientX;
  }


  onTouchEnd(): void {

    if (!this.isDragging) {
      return;
    }

    const diferencia =
      this.touchCurrentX -
      this.touchStartX;

    this.isDragging = false;

    if (
      Math.abs(diferencia) < 55
    ) {
      return;
    }

    if (diferencia < 0) {
      this.irSiguiente();
    } else {
      this.irAnterior();
    }
  }


  /* =====================================
     APROBACIÓN
     ===================================== */

  aprobarCliente(
    cliente: Usuario
  ): void {

    if (
      this.procesandoCliente()
    ) {
      return;
    }

    this.procesandoCliente.set(true);

    /*
     * TEMPORAL.
     * Todavía no modifica Supabase.
     */
    this.animarSalida(cliente);
  }


  /* =====================================
     RECHAZO
     ===================================== */

  abrirRechazo(
    cliente: Usuario
  ): void {

    if (
      this.procesandoCliente()
    ) {
      return;
    }

    this.clienteARechazar.set(
      cliente
    );

    this.motivoRechazo.set('');

    this.mostrarModalRechazo.set(
      true
    );
  }


  cerrarModalRechazo(): void {

    if (
      this.procesandoCliente()
    ) {
      return;
    }

    this.mostrarModalRechazo.set(
      false
    );

    this.clienteARechazar.set(
      null
    );

    this.motivoRechazo.set('');
  }


  actualizarMotivo(
    motivo: string
  ): void {

    this.motivoRechazo.set(
      motivo
    );
  }


  confirmarRechazo(
    motivo: string
  ): void {

    const cliente =
      this.clienteARechazar();

    if (
      !cliente ||
      !motivo.trim() ||
      this.procesandoCliente()
    ) {
      return;
    }

    this.mostrarModalRechazo.set(
      false
    );

    this.procesandoCliente.set(
      true
    );

    /*
     * TEMPORAL.
     * Todavía no modifica Supabase.
     */
    this.animarSalida(cliente);
  }


  /* =====================================
     ANIMACIÓN
     ===================================== */

  private animarSalida(
    cliente: Usuario
  ): void {

    this.tarjetaSaliendo.set(
      true
    );

    setTimeout(() => {

      this.eliminarClienteVisualmente(
        cliente
      );

      this.tarjetaSaliendo.set(
        false
      );

      this.procesandoCliente.set(
        false
      );

    }, 500);
  }


  private eliminarClienteVisualmente(
    cliente: Usuario
  ): void {

    const nuevosClientes =
      this.clientesPendientes()
        .filter(
          item =>
            item.id !== cliente.id
        );

    this.clientesPendientes.set(
      nuevosClientes
    );

    if (
      nuevosClientes.length === 0
    ) {

      this.indiceActual.set(0);

      return;
    }

    if (
      this.indiceActual() >=
      nuevosClientes.length
    ) {

      this.indiceActual.set(
        nuevosClientes.length - 1
      );
    }
  }


  volver(): void {
    void this.router.navigate([
      '/admin',
    ]);
  }
}