import { Component, inject, OnInit } from '@angular/core';
import { IonButton, ModalController, ToastController } from '@ionic/angular';
import { TableQrModalComponent } from '../table-qr-modal/table-qr-modal.component';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { Confirm, Table, Vibracion } from '@app/services';

@Component({
  selector: 'app-table-action-sheet',
  templateUrl: './table-action-sheet.component.html',
  styleUrls: ['./table-action-sheet.component.scss'],
  imports: [IonButton, RouterModule],
})
export class TableActionSheetComponent {
  private _modalController = inject(ModalController);
  private _router = inject(Router);
  private _tableRepository = inject(Table);
    private _confirm = inject(Confirm);
    private _toastController = inject(ToastController);
    private _vibracion = inject(Vibracion);
  
  table: any;

    private async mostrarAviso(mensaje: string): Promise<void> {
    const toast = await this._toastController.create({
      message: mensaje,
      duration: 3000,
      position: 'top',
      color: 'success',
    });
    await toast.present();
  }

  private async mostrarError(): Promise<void> {
    await this._vibracion.error();
    const toast = await this._toastController.create({
      message: 'No pudimos completar la acción. Intentá nuevamente más tarde.',
      duration: 5000,
      position: 'top',
      color: 'danger',
    });
    await toast.present();
  }

  async onShowQRSheet() {
    const modal = await this._modalController.create({
      component: TableQrModalComponent,
      componentProps: {
        table: this.table
      },
      cssClass: 'confirm-modal',
    });

    await modal.present();
  }

  async onClick() {
    await this._modalController.dismiss();

    await this._router.navigate(['/admin/tables/edit', this.table.id]);
  }

  async darDeBaja(item: any): Promise<void> {
      const confirmado = await this._confirm.preguntar({
        titulo: '¿Dar de baja la Mesa?',
        mensaje: `La mesa N°"${item.numero}" va a hacer dada de baja. Vas a poder reactivarla cuando quieras.`,
        textoConfirmar: 'Dar de baja',
        colorConfirmar: 'danger',
        icono: 'trash-outline',
      });
  
      if (!confirmado) return;
  
      try {
        await this._tableRepository.update(item.id, { baja_logica: true });
        await this._modalController.dismiss();
        await this.mostrarAviso('Mesa dada de baja correctamente.');
      } catch (error) {
        await this.mostrarError();
      }
    }
  
    async reactivar(item: any): Promise<void> {
      const confirmado = await this._confirm.preguntar({
        titulo: '¿Reactivar la mesa?',
        mensaje: `La mesa N°"${item.numero}" va a volver a estar disponible.`,
        textoConfirmar: 'Reactivar',
        colorConfirmar: 'primary',
        icono: 'refresh-outline',
      });
  
      if (!confirmado) return;
  
      try {
        await this._tableRepository.update(item.id, { baja_logica: false });
        await this._modalController.dismiss();
        await this.mostrarAviso('Mesa reactivada correctamente.');
      } catch (error) {
        await this.mostrarError();
      }
    }
}
