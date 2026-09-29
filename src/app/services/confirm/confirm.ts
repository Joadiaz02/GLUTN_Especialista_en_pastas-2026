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

// abre el cartel de confirmación desde cualquier acción
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
