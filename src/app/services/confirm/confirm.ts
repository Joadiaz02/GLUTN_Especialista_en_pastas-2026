import { inject, Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ConfirmDialogComponent } from '../../components/ui/confirm-cartel/confirm-cartel.component';

export interface OpcionesConfirmacion {
  titulo?: string;
  mensaje?: string;
  textoCancelar?: string;
  textoConfirmar?: string;
  colorConfirmar?: 'danger' | 'primary';
  icono?: string;
}

// Envuelve el cartel de confirmación que ya existe (usado hoy para el
// logout de Admin) para poder abrirlo desde cualquier botón/acción,
// sin depender de su modo "trigger" (que siempre muestra el ícono de
// logout). Reutiliza el mismo componente como contenido del modal.
@Injectable({ providedIn: 'root' })
export class Confirm {
  private _modalController = inject(ModalController);

  async preguntar(opciones: OpcionesConfirmacion): Promise<boolean> {
    const modal = await this._modalController.create({
      component: ConfirmDialogComponent,
      componentProps: {
        titulo: opciones.titulo ?? '¿Estás seguro?',
        mensaje: opciones.mensaje ?? '',
        textoCancelar: opciones.textoCancelar ?? 'Cancelar',
        textoConfirmar: opciones.textoConfirmar ?? 'Confirmar',
        colorConfirmar: opciones.colorConfirmar ?? 'danger',
        icono: opciones.icono ?? 'help-circle-outline',
        esContenidoModal: true,
      },
      breakpoints: [0, 0.4],
      initialBreakpoint: 0.4,
    });

    await modal.present();

    const { role } = await modal.onWillDismiss();

    return role === 'confirm';
  }
}
