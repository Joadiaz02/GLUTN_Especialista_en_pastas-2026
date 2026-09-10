import { Component, Input } from "@angular/core";
import { Router } from "@angular/router";
import { Auth } from "@app/services";
import { IonButton, IonIcon, ModalController } from "@ionic/angular";
import { addIcons } from "ionicons";
import { logOutOutline } from "ionicons/icons";

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
  constructor(
    private modalController: ModalController,
    private router: Router,
    private auth: Auth
  ) {
    addIcons({
      'log-out-outline': logOutOutline
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
      await this.cerrarSesion();
    }
  }

  async confirmar() {
    await this.modalController.dismiss(null, 'confirm');
  }

  async cancelar() {
    await this.modalController.dismiss(null, 'cancel');
  }

  private async cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('mesa');

    await this.auth.logout();

    await this.router.navigate(['/login']);
  }
}