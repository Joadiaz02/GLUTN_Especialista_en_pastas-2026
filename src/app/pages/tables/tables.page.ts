import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonIcon, IonButton } from '@ionic/angular';
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
    IonIcon
],
})
export class TablesPage {
  private _router = inject(Router);
  private _tableService = inject(Table);

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
}
