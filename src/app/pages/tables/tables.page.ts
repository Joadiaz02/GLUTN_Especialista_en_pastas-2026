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
import { Confirm, Table } from '@app/services';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { TableQrModalComponent } from './components/table-qr-modal/table-qr-modal.component';
import { HeaderComponent } from '@app/components/ui';
import { TableActionSheetComponent } from './components/table-action-sheet/table-action-sheet.component';
import { ClientsNavigationComponent } from '../clients/components/clients-navigation/clients-navigation.component';

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
    HeaderComponent,
    ClientsNavigationComponent,
  ],
})
export class TablesPage {
  private _router = inject(Router);
  private _tableService = inject(Table);
  private _toastController = inject(ToastController);
  private _confirm = inject(Confirm);
  private _modalController = inject(ModalController);

  private touchStartX = 0;
  private touchEndX = 0;

  indiceActual = signal(0);
  procesandoCliente = signal(false);

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

  get totalMesas(): number {
    const tables = this.tables();

    return tables !== null ? tables.length : 0;
  }

  get posicionVisible(): number {
    return this.totalMesas === 0 ? 0 : this.indiceActual() + 1;
  }

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

  obtenerPosicionCarta(indice: number): number {
    const total = this.totalMesas;

    if (total === 0) {
      return 0;
    }

    let posicion = indice - this.indiceActual();

    if (posicion > total / 2) {
      posicion -= total;
    }

    if (posicion < -total / 2) {
      posicion += total;
    }

    return posicion;
  }

  obtenerClaseCarta(
    indice: number
  ): 'activa' | 'anterior' | 'siguiente' | 'oculta' {
    const posicion = this.obtenerPosicionCarta(indice);

    if (posicion === 0) {
      return 'activa';
    }

    if (posicion === -1) {
      return 'anterior';
    }

    if (posicion === 1) {
      return 'siguiente';
    }

    return 'oculta';
  }

  onTouchStart(event: TouchEvent): void {
    if (this.procesandoCliente()) return;

    this.touchStartX = event.changedTouches[0]?.screenX ?? 0;

    this.touchEndX = this.touchStartX;
  }

  onTouchMove(event: TouchEvent): void {
    if (this.procesandoCliente()) return;

    this.touchEndX = event.changedTouches[0]?.screenX ?? this.touchEndX;
  }

  onTouchEnd(event: TouchEvent): void {
    if (this.procesandoCliente()) return;

    this.touchEndX = event.changedTouches[0]?.screenX ?? this.touchEndX;

    this.procesarSwipe();
  }

  private procesarSwipe(): void {
    const distancia = this.touchEndX - this.touchStartX;

    if (Math.abs(distancia) < 50) {
      return;
    }

    if (distancia > 0) {
      this.irAnterior();
    } else {
      this.irSiguiente();
    }
  }

  irAnterior(): void {
    if (this.procesandoCliente()) return;

    const total = this.totalMesas;

    if (total <= 1) return;

    const nuevoIndice = this.indiceActual() - 1;

    if (nuevoIndice < 0) {
      this.indiceActual.set(total - 1);
      
      return;
    }

    this.indiceActual.set(nuevoIndice);
  }

  irSiguiente(): void {
    if (this.procesandoCliente()) return;

    const total = this.totalMesas;

    if (total <= 1) return;

    const nuevoIndice = this.indiceActual() + 1;

    if (nuevoIndice >= total) {
      this.indiceActual.set(0);
      
      return;
    }

    this.indiceActual.set(nuevoIndice);
  }

  async onToggle(table: any, event: CustomEvent): Promise<void> {
    const activa: boolean = event.detail.checked;

    if (activa === !table.baja_logica) return;

    const toggleEl = event.target as HTMLIonToggleElement;

    try {
      const confirmed = activa
        ? await this._confirm.preguntar({
            titulo: '¿Reactivar la mesa?',
            mensaje: `"La mesa ${table.numero}" va a volver a estar disponible.`,
            textoConfirmar: 'Reactivar',
            colorConfirmar: 'primary',
            icono: 'refresh-outline',
          })
        : await this._confirm.preguntar({
            titulo: '¿Dar de baja la mesa?',
            mensaje: `"La mesa ${table.numero}" va a dejar de estar disponible. Vas a poder reactivarlo cuando quieras.`,
            textoConfirmar: 'Dar de baja',
            colorConfirmar: 'danger',
            icono: 'trash-outline',
          });

      if (!confirmed) {
        toggleEl.checked = !activa;
        return;
      }

      await this._tableService.update(table.id, { baja_logica: !activa });


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
