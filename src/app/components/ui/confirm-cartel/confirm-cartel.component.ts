import { Component, EventEmitter, Input, Output } from "@angular/core";
import { IonButton, IonIcon, ModalController } from "@ionic/angular";
import { addIcons } from "ionicons";
import {
  logOutOutline,
  arrowBackOutline,
  trashOutline,
  restaurantOutline,
  star,
  starOutline,
  helpCircleOutline,
} from "ionicons/icons";

@Component({
  selector: 'app-confirm-dialog',
  imports: [IonButton, IonIcon ],
  templateUrl: './confirm-cartel.component.html',
  styleUrl: './confirm-cartel.component.scss' })

export class ConfirmDialogComponent {

  @Input() titulo = '¿Estás seguro?';
  @Input() mensaje = '';
  @Input() textoCancelar = 'Cancelar';
  @Input() textoConfirmar = 'Confirmar';
  @Input() colorConfirmar: 'danger' | 'primary' = 'danger';
  @Input() icono = 'log-out-outline';
  @Input() esContenidoModal = false;

  // Se emite cuando el usuario confirma la acción en el modal.
  // Quien use este botón decide qué hacer al confirmar (logout,
  // borrar, guardar, etc.) — este componente solo pregunta.
  @Output() confirmado = new EventEmitter<void>();

  constructor(private modalController: ModalController) {
    addIcons({
      'log-out-outline': logOutOutline,
      'arrow-back-outline': arrowBackOutline,
      'trash-outline': trashOutline,
      'restaurant-outline': restaurantOutline,
      star,
      'star-outline': starOutline,
      'help-circle-outline': helpCircleOutline,
    });
  }

  async abrirConfirmacion() {

    const modal = await this.modalController.create({
      component: ConfirmDialogComponent,

      componentProps: {
        titulo: this.titulo,
        mensaje: this.mensaje,
        textoCancelar: this.textoCancelar,
        textoConfirmar: this.textoConfirmar,
        colorConfirmar: this.colorConfirmar,
        icono: this.icono,

        esContenidoModal: true
      },

      breakpoints: [0, 0.4],
      initialBreakpoint: 0.4
    });

    await modal.present();

    const { role } = await modal.onWillDismiss();

    if (role === 'confirm') {
      this.confirmado.emit();
    }
  }

  async confirmar() {
    await this.modalController.dismiss(null, 'confirm');
  }

  async cancelar() {
    await this.modalController.dismiss(null, 'cancel');
  }
}
