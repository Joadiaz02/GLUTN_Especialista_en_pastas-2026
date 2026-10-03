import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  ToastController,
} from '@ionic/angular';
import { Confirm, User, Vibracion } from '@app/services';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { HeaderComponent } from '@app/components/ui';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { catchError, of } from 'rxjs';

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
    SpinnerLogoComponent
],
})
export class EmployeesPage {
  private _router = inject(Router);
  private _toastController = inject(ToastController);
  private _confirm = inject(Confirm);
  private _vibracion = inject(Vibracion);

  private _userRepository = inject(User);

  users = toSignal(
    this._userRepository.getEmployeeListChange().pipe(
      catchError((error) => {
        console.error('Error loading employees:', error);
        return of([]);
      })
    ),
    { initialValue: null }
  );

  isLoading = computed(() => this.users() === null);

  volver(): void {
    void this._router.navigate(['/admin/employees']);
  }

  async onDelete(user: any): Promise<void> {
    // Dar de baja a un empleado??
  }

  async onEdit(user: any) {
    console.log(user)
  }
}
