import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonIcon, IonFab, IonFabButton, ModalController, PopoverController, IonButton } from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { SelectorDisponibilidadComponent } from '@app/components/selector-disponibilidad/selector-disponibilidad.component';
import { VerQrMesaComponent } from '@app/components/ver-qr-mesa/ver-qr-mesa.component';
import { Table } from '@app/services';

type Disponibilidad = 'vacia' | 'ocupada' | 'reservada';
type TipoMesa = 'vip' | 'estandar' | 'movilidad_reducida';

interface Mesa {
  id: string;
  numero: number;
  comensales: number;
  tipo: TipoMesa;
  disponibilidad: Disponibilidad;
  foto?: string;
}

@Component({
  selector: 'app-tables',
  templateUrl: './tables.page.html',
  styleUrls: ['./tables.page.scss'],
  imports: [
    CommonModule, RouterLink, IonContent, IonHeader, IonTitle, IonToolbar,
    IonButtons, IonIcon, IonFab, IonFabButton, ConfirmVolverComponent,
    IonButton
],
})
export class TablesPage {
  private _router = inject(Router);
  private _modalCtrl = inject(ModalController);
  private _popoverCtrl = inject(PopoverController);
  private _tableService = inject(Table);

  readonly tipoLabel: Record<TipoMesa, string> = {
    vip: 'VIP',
    estandar: 'Estándar',
    movilidad_reducida: 'Movilidad reducida',
  };

  readonly disponibilidadLabel: Record<Disponibilidad, string> = {
    vacia: 'Vacía',
    ocupada: 'Ocupada',
    reservada: 'Reservada',
  };

  mesas = signal<Mesa[]>([]);
  hayMesas = computed(() => this.mesas().length > 0);
  cargando = signal(true);

  async ngOnInit(): Promise<void> {
    const tables = await this._tableService.getList();

    // TODO: reemplazar por SELECT * FROM mesas ORDER BY numero
    this.mesas.set(tables);

    this.cargando.set(false);
  }

  volver(): void {
    void this._router.navigate(['/admin']);
  }

  crearMesa(): void {
    void this._router.navigate(['/admin/mesas/crear']);
  }

  async verQr(mesa: Mesa): Promise<void> {
    const modal = await this._modalCtrl.create({
      component: VerQrMesaComponent,
      componentProps: { mesaId: mesa.id, numero: mesa.numero },
    });
    await modal.present();
  }

  async cambiarDisponibilidad(mesa: Mesa, ev: Event): Promise<void> {
    const popover = await this._popoverCtrl.create({
      event: ev,
      component: SelectorDisponibilidadComponent,
      componentProps: { actual: mesa.disponibilidad },
    });
    await popover.present();

    const { data } = await popover.onDidDismiss<Disponibilidad>();
    if (!data) return;

    // TODO: UPDATE mesas SET disponibilidad = data WHERE id = mesa.id
    this.mesas.update((lista) =>
      lista.map((m) => (m.id === mesa.id ? { ...m, disponibilidad: data } : m))
    );
  }
}
