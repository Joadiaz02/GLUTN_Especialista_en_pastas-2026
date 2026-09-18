import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons } from '@ionic/angular';
import { Router } from '@angular/router';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';

@Component({
  selector: 'app-edit-table',
  templateUrl: './edit-table.page.html',
  styleUrls: ['./edit-table.page.scss'],
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonButtons,
    ConfirmVolverComponent
],
})
export class EditTablePage {
  private _router = inject(Router);

  volver(): void {
    void this._router.navigate(['/admin']);
  }
}
