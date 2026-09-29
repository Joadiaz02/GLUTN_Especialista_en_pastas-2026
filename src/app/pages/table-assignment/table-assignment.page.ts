import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonTitle, IonToolbar, ToastController } from '@ionic/angular';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { ActivatedRoute, Router } from '@angular/router';
import { User, Waitlist } from '@app/services';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';

@Component({
  selector: 'app-table-assignment',
  templateUrl: './table-assignment.page.html',
  styleUrls: ['./table-assignment.page.scss'],
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
    SpinnerLogoComponent
  ],
})
export class TableAssignmentPage implements OnInit {
  private _route = inject(ActivatedRoute);
  private _router = inject(Router);
  private _userRepository = inject(User);
  private _waitlistRepository = inject(Waitlist);
  private _toastController = inject(ToastController);

  currentTable = signal<any>(null);
  waitlist = signal<any>(null);
  user = signal<any>(null);
  loading = signal<boolean>(false);
  availableTables = signal<any[]>([]);

  async ngOnInit() {
    const id = this._route.snapshot.paramMap.get('id') ?? '';
    
    console.log(id);
    
    this.loading.set(true)
    
    const waitlist = await this._waitlistRepository.getById(id)
    
    console.log(waitlist)

    const tables = await this._waitlistRepository.getAvailableTables();
    
    console.log(tables);

    this.user.set(waitlist.usuarios)
    this.availableTables.set(tables)
    this.waitlist.set(waitlist)
    this.loading.set(false)
  }

  tableSelected(table: any) {
    this.currentTable.set(table);
  }

  async assignTable() {
    try {
      
      console.log(this.currentTable())
      console.log(this.waitlist())
      
      await this._waitlistRepository.assignTable(this.waitlist().id, this.currentTable().id)
      
      const toast = await this._toastController.create({
        message: 'Se asigno la mesa correctamente',
        duration: 5000,
        position: 'bottom',
      });

      await toast.present();

      await this._router.navigate(['/admin/waitlist']);
    } catch (error) {
      const toast = await this._toastController.create({
        message:
          'No pudimos completar la acción. Intentá nuevamente más tarde.',
        duration: 5000,
        position: 'top',
      });

      await toast.present();
    }
  }

  volver(): void {
    void this._router.navigate(['/admin/waitlist']);
  }
}
