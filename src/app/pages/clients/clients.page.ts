import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { Router } from '@angular/router';
import { SupabaseService } from '@app/services/supabase.service';

interface ClientePendiente {
  id: string;
  apellido: string;
  nombre: string;
  documento: string;
  perfil: string;
  avatar: string | null;
  estado_aprobacion: string;
  motivo_rechazo: string | null;
}

@Component({
  selector: 'app-clients',
  templateUrl: './clients.page.html',
  styleUrls: ['./clients.page.scss'],
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonSpinner,
  ],
})
export class ClientsPage implements OnInit {
  clientesPendientes = signal<ClientePendiente[]>([]);
  cargando = signal<boolean>(false);

  private readonly supabaseService = inject(SupabaseService);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);

  async ngOnInit(): Promise<void> {
    await this.cargarClientesPendientes();
  }

  async cargarClientesPendientes(): Promise<void> {
    this.cargando.set(true);

    try {
      const { data, error } = await this.supabaseService.client
        .from('usuarios')
        .select(
          `
            id,
            apellido,
            nombre,
            documento,
            perfil,
            avatar,
            estado_aprobacion,
            motivo_rechazo
          `
        )
        .eq('perfil', 'cliente_registrado')
        .eq('estado_aprobacion', 'pendiente')
        .order('apellido', { ascending: true });

      if (error) {
        throw error;
      }

      this.clientesPendientes.set(
        (data ?? []) as ClientePendiente[]
      );
    } catch (error) {
      console.error('Error al cargar clientes pendientes:', error);

      await this.mostrarToast(
        'No pudimos cargar los clientes pendientes.'
      );
    } finally {
      this.cargando.set(false);
    }
  }

  obtenerAvatarUrl(avatar: string | null): string | null {
    if (!avatar) {
      return null;
    }

    if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
      return avatar;
    }

    const { data } = this.supabaseService.client.storage
      .from('images')
      .getPublicUrl(avatar);

    return data.publicUrl;
  }

  nombreCompleto(cliente: ClientePendiente): string {
    return `${cliente.apellido}, ${cliente.nombre}`;
  }

  async aprobarCliente(cliente: ClientePendiente): Promise<void> {
    console.log('Aprobar cliente:', cliente);
  }

  async rechazarCliente(cliente: ClientePendiente): Promise<void> {
    console.log('Rechazar cliente:', cliente);
  }

  volver(): void {
    void this.router.navigate(['/admin']);
  }

  private async mostrarToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 4000,
      position: 'top',
    });

    await toast.present();
  }
}