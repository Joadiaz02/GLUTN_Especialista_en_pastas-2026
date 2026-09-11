import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { ModalController, IonButton, IonIcon } from '@ionic/angular';
import { ConfirmDialogComponent } from '../confirm-cartel/confirm-cartel.component';

@Component({
  selector: 'app-confirm-volver',
  templateUrl: './confirm-volver.component.html',
  styleUrls: ['./confirm-volver.component.scss'],
  imports: [IonButton, IonIcon],
})
export class ConfirmVolverComponent {
  @Input() titulo = '¿Quieres volver?';
  @Input() mensaje = '';
  @Input() textoCancelar = 'Cancelar';
  @Input() textoConfirmar = 'Confirmar';
  @Input() colorConfirmar: 'danger' | 'primary' = 'danger';
  @Input() icono = 'Volver';
  @Input() esContenidoModal = false;

  @Output() confirmadoVolver = new EventEmitter<void>();
  constructor(
    private modalController: ModalController,
  ) {}

   async abrirConfirmacion() {

    const modal = await this.modalController.create({
      component: ConfirmDialogComponent,

      componentProps: {
        titulo: this.titulo,
        mensaje: this.mensaje,
        textoCancelar: this.textoCancelar,
        textoConfirmar: this.textoConfirmar,
        colorConfirmar: this.colorConfirmar,
        msj: this.icono,

        esContenidoModal: true
      },

      breakpoints: [0, 0.4],
      initialBreakpoint: 0.4
    });

    await modal.present();

    const { role } = await modal.onWillDismiss();

    if (role === 'confirm') {
      this.confirmadoVolver.emit();
    }
  }

    async confirmar() {
    await this.modalController.dismiss(null, 'confirm');
  }

  async cancelar() {
    await this.modalController.dismiss(null, 'cancel');
  }

  
}
