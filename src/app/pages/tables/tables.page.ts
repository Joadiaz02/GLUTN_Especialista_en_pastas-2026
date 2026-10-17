import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonIcon,
  IonButton,
  IonToggle,
  ToastController,
  ModalController,
} from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { Confirm, Table, Vibracion } from '@app/services';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { TableQrModalComponent } from './components/table-qr-modal/table-qr-modal.component';
import { HeaderComponent } from '@app/components/ui';
import { TableActionSheetComponent } from './components/table-action-sheet/table-action-sheet.component';

@Component({
  selector: 'app-tables',
  templateUrl: './tables.page.html',
  styleUrls: ['./tables.page.scss'],
  imports: [
    CommonModule,
    RouterLink,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    ConfirmVolverComponent,
    IonButton,
    SpinnerLogoComponent,
    IonIcon,
    IonToggle,
    HeaderComponent
],
})
export class TablesPage {
  private _router = inject(Router);
  private _tableService = inject(Table);
  private _toastController = inject(ToastController);
  private _confirm = inject(Confirm);
  private _vibracion = inject(Vibracion);
  private _modalController = inject(ModalController);

  readonly tipoLabel: any = {
    vip: 'VIP',
    estandar: 'Estándar',
    movilidad_reducida: 'Movilidad reducida',
    vip_movilidad_reducida: 'Vip con Movilidad reducida',
  };

  tables = toSignal(this._tableService.getListChanges(), {
    initialValue: null,
  });

  isLoading = computed(() => this.tables() === null);

  volver(): void {
    void this._router.navigate(['/admin']);
  }

  async showModalSheet($event: any, table: any) {
    $event.stopPropagation();

    const modal = await this._modalController.create({
      component: TableQrModalComponent,
      componentProps: { table },
      cssClass: 'confirm-modal',
    });

    await modal.present();
  }

  async onOpenSheet(table: any) {
    const modal = await this._modalController.create({
      component: TableActionSheetComponent,
      componentProps: { table },
      cssClass: 'confirm-modal',
    });

    await modal.present();
  }

  async onToggle(table: any, event: CustomEvent): Promise<void> {
    const activa: boolean = event.detail.checked;

    if (activa === !table.baja_logica) return;

    const toggleEl = event.target as HTMLIonToggleElement;

    try {
      const confirmed = activa
        ? await this._confirm.preguntar({
            titulo: '¿Reactivar la mesa?',
            mensaje: `"La mesa N°${table.numero}" va a volver a estar disponible.`,
            textoConfirmar: 'Reactivar',
            colorConfirmar: 'primary',
            icono: 'refresh-outline',
          })
        : await this._confirm.preguntar({
            titulo: '¿Dar de baja la mesa?',
            mensaje: `"La mesa N°${table.numero}" va a dejar de estar disponible. Vas a poder reactivarlo cuando quieras.`,
            textoConfirmar: 'Dar de baja',
            colorConfirmar: 'danger',
            icono: 'trash-outline',
          });

      if (!confirmed) {
        toggleEl.checked = !activa;
        return;
      }

      await this._tableService.update(table.id, { baja_logica: !activa });

      await this._vibracion.confirmacion();

      const toast = await this._toastController.create({
        message: activa
          ? 'Mesa reactivada correctamente.'
          : 'Mesa dada de baja correctamente.',
        duration: 3000,
        position: 'top',
        color: 'success',
      });

      await toast.present();
    } catch (error) {
      const toast = await this._toastController.create({
        message:
          'No pudimos completar la acción. Intentá nuevamente más tarde.',
        duration: 5000,
        position: 'top',
      });

      await toast.present();

      toggleEl.checked = !activa;
    }
  }
}
