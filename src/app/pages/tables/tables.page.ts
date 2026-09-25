import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonIcon, IonButton, IonToggle, ToastController } from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { Table } from '@app/services';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { toSignal } from '@angular/core/rxjs-interop';

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
    IonToggle
],
})
export class TablesPage {
  private _router = inject(Router);
  private _tableService = inject(Table);
  private _toastController = inject(ToastController);  

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

  async onToggle(table: any, event: CustomEvent): Promise<void> {
    const activa: boolean = event.detail.checked;

    if (activa === !table.baja_logica) return;

    try {
      await this._tableService.update(table.id, { baja_logica: !activa });
    } catch (error) {
      const toast = await this._toastController.create({
        message:
          'No pudimos completar la acción. Intentá nuevamente más tarde.',
        duration: 5000,
        position: 'top',
      });

      await toast.present();

      (event.target as HTMLIonToggleElement).checked = !activa;
    }
  }
}
