import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonIcon, IonButton } from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';
import { DrinkCardComponent } from './components/drink-card/drink-card.component';
import { Table } from '@app/services';
import { SkeletonCardComponent } from './components/skeleton-card/skeleton-card.component';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';

@Component({
  selector: 'app-drinks',
  templateUrl: './drinks.page.html',
  styleUrls: ['./drinks.page.scss'],
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonButtons,
    IonBackButton,
    RouterLink,
    DrinkCardComponent,
    IonIcon,
    SkeletonCardComponent,
    ConfirmVolverComponent,
    IonButton
],
})
export class DrinksPage implements OnInit {
  drinks = signal<any[]>([]);

  isLoading = signal<boolean>(false);

  private _tableService = inject(Table);
  private _router = inject(Router);
  
  

  async ngOnInit() {
    this.isLoading.set(true);

    const drinks = await this._tableService.getList();

    this.isLoading.set(false);

    this.drinks.set(drinks);
  }
  volver(): void {
    
    void this._router.navigate(['/admin']);
  }
}
