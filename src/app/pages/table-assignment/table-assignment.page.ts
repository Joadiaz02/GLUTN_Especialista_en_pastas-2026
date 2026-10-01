import {
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import {
  ActivatedRoute,
  Router,
} from '@angular/router';
import { Waitlist } from '@app/services';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';

@Component({
  selector: 'app-table-assignment',
  templateUrl:
    './table-assignment.page.html',
  styleUrls: [
    './table-assignment.page.scss',
  ],
  imports: [
    CommonModule,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonFooter,
    IonButton,
    ConfirmVolverComponent,
    IonContent,
    SpinnerLogoComponent,
  ],
})
export class TableAssignmentPage
  implements OnInit
{
  private _route = inject(ActivatedRoute);
  private _router = inject(Router);
  private _waitlistRepository =
    inject(Waitlist);
  private _toastController =
    inject(ToastController);

  currentTable = signal<any>(null);
  waitlist = signal<any>(null);
  user = signal<any>(null);

  loading = signal<boolean>(false);
  assigning = signal<boolean>(false);

  availableTables =
    signal<any[]>([]);

  async ngOnInit(): Promise<void> {
    const id =
      this._route.snapshot.paramMap.get(
        'id'
      ) ?? '';

    if (!id) {
      await this.mostrarError(
        'No se encontró el cliente seleccionado.'
      );

      await this.volver();
      return;
    }

    this.loading.set(true);

    try {
      const waitlist =
        await this._waitlistRepository.getById(
          id
        );

      if (!waitlist) {
        await this.mostrarError(
          'El cliente ya no se encuentra en la lista de espera.'
        );

        await this.volver();
        return;
      }

      const tables =
        await this._waitlistRepository.getTablesForAssignment(
          waitlist
        );

      this.user.set(
        waitlist.usuarios
      );

      this.availableTables.set(
        tables
      );

      this.waitlist.set(
        waitlist
      );
    } catch (error) {
      console.error(
        'Error cargando asignación de mesa:',
        error
      );

      await this.mostrarError(
        'No pudimos cargar las mesas. Intentá nuevamente.'
      );
    } finally {
      this.loading.set(false);
    }
  }

  tableSelected(table: any): void {
    if (!table?.compatible) {
      return;
    }

    if (this.assigning()) {
      return;
    }

    this.currentTable.set(
      table
    );
  }

  hayMesasCompatibles(): boolean {
    return this.availableTables().some(
      (table) => table.compatible
    );
  }

  getConsideracionLabel(
    valor: string
  ): string {
    switch (valor) {
      case 'movilidad_reducida':
        return 'Movilidad reducida';

      case 'silla_bebe':
        return 'Silla para bebé';

      default:
        return 'Otra consideración';
    }
  }

  async assignTable(): Promise<void> {
    const selectedTable =
      this.currentTable();

    const currentWaitlist =
      this.waitlist();

    if (
      !selectedTable ||
      !currentWaitlist
    ) {
      return;
    }

    if (
      !selectedTable.compatible
    ) {
      await this.mostrarError(
        'La mesa seleccionada no es compatible con este cliente.'
      );

      return;
    }

    this.assigning.set(true);

    try {
      await this._waitlistRepository.assignTable(
        currentWaitlist.id,
        selectedTable.id
      );

      const toast =
        await this._toastController.create({
          message:
            `Mesa ${selectedTable.numero} asignada correctamente.`,
          duration: 3000,
          position: 'top',
          color: 'success',
        });

      await toast.present();

      await this._router.navigate([
        '/admin/waitlist',
      ]);
    } catch (error) {
      console.error(
        'Error asignando mesa:',
        error
      );

      await this.mostrarError(
        'No pudimos asignar la mesa. Es posible que haya sido ocupada por otro usuario. Actualizá la lista e intentá nuevamente.'
      );

      try {
        const tables =
          await this._waitlistRepository.getTablesForAssignment(
            currentWaitlist
          );

        this.availableTables.set(
          tables
        );

        this.currentTable.set(
          null
        );
      } catch (refreshError) {
        console.error(
          'Error actualizando mesas:',
          refreshError
        );
      }
    } finally {
      this.assigning.set(false);
    }
  }

  async mostrarError(
    mensaje: string
  ): Promise<void> {
    const toast =
      await this._toastController.create({
        message: mensaje,
        duration: 3500,
        position: 'top',
        color: 'danger',
      });

    await toast.present();
  }

  async volver(): Promise<void> {
    await this._router.navigate([
      '/admin/waitlist',
    ]);
  }
}