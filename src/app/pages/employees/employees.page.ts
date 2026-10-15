import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon, ToastController, IonSegment, IonSegmentButton, IonLabel, ModalController } from '@ionic/angular';
import { Confirm, User, Vibracion } from '@app/services';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { HeaderComponent } from '@app/components/ui';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { catchError, of } from 'rxjs';
import { EmployeeActionSheetComponent } from './employee-action-sheet/employee-action-sheet.component';

@Component({
  selector: 'app-employees',
  templateUrl: './employees.page.html',
  styleUrls: ['./employees.page.scss'],
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonButtons,
    ConfirmVolverComponent,
    IonButton,
    IonIcon,
    RouterLink,
    HeaderComponent,
    SpinnerLogoComponent,
    IonSegment,
    IonSegmentButton,
    IonLabel
],
})
export class EmployeesPage {
  private readonly _router = inject(Router);
  private readonly _modalController = inject(ModalController);
  private readonly _toastController = inject(ToastController);
  private readonly _userRepository = inject(User);

  private _confirm = inject(Confirm);

  private readonly _users = toSignal(this._userRepository.getListChanges(), {
    initialValue: null,
  });
 
  readonly filter = signal<any>('active');
  readonly isSaving = signal(false);
 
  readonly isLoading = computed(() => this._users() === null);
 
  readonly employees = computed<any[]>(() =>
    ((this._users() ?? []) as any[]).map((employee) => ({
      ...employee,
      isActive: employee.active !== false,
      initials: this.getInitials(employee),
    }))
  );
 
  readonly activeCount = computed(
    () => this.employees().filter((employee) => employee.is_active).length
  );
 
  readonly inactiveCount = computed(
    () => this.employees().filter((employee) => !employee.is_active).length
  );
 
  readonly visibleEmployees = computed(() => {
    const showActive = this.filter() === 'active';
    return this.employees().filter((employee) => employee.is_active === showActive);
  });
 
  onFilterChange(event: any): void {
    const value = event.detail.value;
 
    if (value === 'active' || value === 'inactive') {
      this.filter.set(value);
    }
  }
 
  async openActions(employee: any): Promise<void> {
    console.log(employee)
    const modal = await this._modalController.create({
      component: EmployeeActionSheetComponent,
      componentProps: { employee },
      cssClass: 'confirm-modal'
    });
 
    await modal.present();
 
    const { role } = await modal.onDidDismiss<void>();
 
    switch (role as any | undefined) {
      case 'edit':
        void this._router.navigate(['/admin/employees/edit', employee.id]);
        break;
      case 'deactivate':
        await this.confirmDeactivate(employee);
        break;
      case 'reactivate':
        await this.setActive(employee, true);
        break;
    }
  }
 
  private async confirmDeactivate(employee: any): Promise<void> {
    const confirmed = await this._confirm.preguntar({
            titulo: '¿Dar de baja el empleado?',
            mensaje: `"${employee.nombre} ${employee.apellido}" va a hacer dado de baja`,
            textoConfirmar: 'Dar de baja',
            colorConfirmar: 'danger',
            icono: 'trash-outline',
          });

      if (!confirmed) {
        return;
      }
 
      await this.setActive(employee, false);
  }
 
  private async setActive(employee: any, active: boolean): Promise<void> {
    if (this.isSaving()) return;
 
    this.isSaving.set(true);
    try {
      await this._userRepository.update(employee.id, {
        is_active: active
      });
      await this.showToast(
        active
          ? `${employee.nombre} ${employee.apellido} fue reactivado.`
          : `${employee.nombre} ${employee.apellido} fue dado de baja.`,
        'success'
      );
    } catch (error) {
      console.error('Error updating employee status:', error);
      await this.showToast(
        active
          ? 'No se pudo reactivar al empleado.'
          : 'No se pudo dar de baja al empleado.',
        'danger'
      );
    } finally {
      this.isSaving.set(false);
    }
  }
 
  private getInitials(employee: any): string {
    const first = employee.nombre?.trim().charAt(0) ?? '';
    const last = employee.apellido?.trim().charAt(0) ?? '';
    return (first + last).toUpperCase();
  }
 
  private async showToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this._toastController.create({
      message,
      color,
      duration: 2500,
      position: 'bottom',
    });
    await toast.present();
  }
}
