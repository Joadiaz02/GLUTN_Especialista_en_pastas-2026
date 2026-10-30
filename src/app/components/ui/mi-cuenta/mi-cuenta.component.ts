import { Component, computed, effect, inject, signal } from '@angular/core';
import { IonButton, IonIcon, IonModal, IonSpinner, ToastController } from '@ionic/angular';
import { Camera } from '@capacitor/camera';
import { Auth, RedSocial } from '@app/services/auth/auth';
import { IngresoSocial } from '@app/services/auth/ingreso-social';
import { Vibracion } from '@app/services/vibracion/vibracion';
import { EPerfilUsuario } from '@app/enums';

const NOMBRE_PERFIL: Record<string, string> = {
  [EPerfilUsuario.Dueno]: 'Dueño',
  [EPerfilUsuario.Supervisor]: 'Supervisor',
  [EPerfilUsuario.Metre]: 'Metre',
  [EPerfilUsuario.Mozo]: 'Mozo',
  [EPerfilUsuario.Cocinero]: 'Cocinero',
  [EPerfilUsuario.Cantinero]: 'Cantinero',
  [EPerfilUsuario.ClienteRegistrado]: 'Cliente',
};

interface FilaRed {
  red: RedSocial;
  nombre: string;
}

// avatar del header + ventana "Mi cuenta" para vincular Google y Discord
@Component({
  selector: 'app-mi-cuenta',
  templateUrl: './mi-cuenta.component.html',
  styleUrls: ['./mi-cuenta.component.scss'],
  imports: [IonButton, IonIcon, IonModal, IonSpinner],
})
export class MiCuentaComponent {
  private readonly auth = inject(Auth);
  private readonly toastController = inject(ToastController);
  private readonly vibracion = inject(Vibracion);
  protected readonly ingresoSocial = inject(IngresoSocial);

  subiendoFoto = signal<boolean>(false);

  readonly redes: FilaRed[] = [
    { red: 'google', nombre: 'Google' },
    { red: 'discord', nombre: 'Discord' },
  ];

  abierto = signal<boolean>(false);
  vinculadas = signal<RedSocial[]>([]);
  cargandoRedes = signal<boolean>(false);

  private readonly usuario = computed(() => this.auth.usuarioActual());

  // el invitado anónimo no tiene cuenta para vincular
  readonly visible = computed(() => {
    const perfil = this.auth.obtenerPerfil(this.usuario());

    return !!perfil && perfil !== EPerfilUsuario.ClienteAnonimo;
  });

  readonly nombreCompleto = computed(() => {
    const metadata = this.usuario()?.user_metadata ?? {};

    return `${metadata['nombre'] ?? ''} ${metadata['apellido'] ?? ''}`.trim();
  });

  readonly iniciales = computed(() => {
    const metadata = this.usuario()?.user_metadata ?? {};
    const nombre: string = metadata['nombre'] ?? '';
    const apellido: string = metadata['apellido'] ?? '';

    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase() || '?';
  });

  readonly avatar = computed<string | null>(
    () => this.usuario()?.user_metadata?.['avatar'] ?? null
  );

  readonly perfil = computed(
    () => NOMBRE_PERFIL[this.auth.obtenerPerfil(this.usuario()) ?? ''] ?? ''
  );

  readonly email = computed<string>(() => this.usuario()?.email ?? '');

  constructor() {
    // después de vincular, refresca el estado de las redes
    effect(() => {
      this.ingresoSocial.vinculacionesActualizadas();

      if (this.visible()) {
        void this.cargarRedes();
      }
    });
  }

  abrir(): void {
    this.abierto.set(true);
    void this.cargarRedes();
  }

  cerrar(): void {
    this.abierto.set(false);
  }

  estaVinculada(red: RedSocial): boolean {
    return this.vinculadas().includes(red);
  }

  async vincular(red: RedSocial): Promise<void> {
    this.cerrar();
    await this.ingresoSocial.vincular(red);
  }

  // saca una foto con la cámara (igual que el registro) y la guarda como foto de perfil
  async cambiarFoto(): Promise<void> {
    if (this.subiendoFoto()) {
      return;
    }

    let archivo: File | null = null;

    try {
      const foto = await Camera.takePhoto({ quality: 60, editable: 'no' });

      if (foto.thumbnail) {
        const formato = foto.metadata?.format ?? 'jpeg';
        const base64 = foto.thumbnail.replace(/^data:image\/\w+;base64,/, '');
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

        archivo = new File([bytes], `perfil-${Date.now()}.${formato}`, {
          type: `image/${formato}`,
        });
      }
    } catch (error) {
      // cerrar la cámara sin sacar foto no es un error para mostrar
      console.warn('No se sacó la foto:', error);

      return;
    }

    if (!archivo) {
      return;
    }

    this.subiendoFoto.set(true);

    try {
      await this.auth.actualizarAvatar(archivo);
      await this.mostrarToast('Foto de perfil actualizada.');
    } catch (error) {
      console.error('No se pudo actualizar la foto:', error);
      await this.vibracion.error();
      await this.mostrarToast('No se pudo actualizar la foto. Intentá nuevamente.');
    } finally {
      this.subiendoFoto.set(false);
    }
  }

  private async mostrarToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'top',
    });

    await toast.present();
  }

  private async cargarRedes(): Promise<void> {
    this.cargandoRedes.set(true);

    try {
      this.vinculadas.set(await this.auth.redesVinculadas());
    } catch (error) {
      console.error('No se pudieron leer las redes vinculadas:', error);
    } finally {
      this.cargandoRedes.set(false);
    }
  }
}
