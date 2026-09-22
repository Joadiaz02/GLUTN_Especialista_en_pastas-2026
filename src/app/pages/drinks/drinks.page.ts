import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonIcon,
} from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';
import { SkeletonCardComponent } from './components/skeleton-card/skeleton-card.component';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { MenuCardComponent } from '@app/components';
import { Drink } from '@app/services';
import { toSignal } from '@angular/core/rxjs-interop';

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
    RouterLink,
    IonIcon,
    SkeletonCardComponent,
    ConfirmVolverComponent,
    MenuCardComponent,
  ],
})
export class DrinksPage {
  private _drinkService = inject(Drink);
  private _router = inject(Router);

  drinks = toSignal(this._drinkService.getListChanges(), {
    initialValue: null,
  });

  isLoading = computed(() => this.drinks() === null);

  async onDeleted(isConfirm: boolean, idCarta: string) {
    try {
      await this._drinkService.update(idCarta, { baja_logica: true });
    } catch (err) {
      console.error('Error al dar de baja el producto:', err);
    }
  }

  async onSuggested(suggested: boolean, idCarta: string) {
    try {
      await this._drinkService.update(idCarta, { sugerencia: suggested });
    } catch (err) {
      console.error('Error al sugerir el producto:', err);
    }
  }

  async onReactivated(isConfirm: boolean, idCarta: string) {
    try {
      await this._drinkService.update(idCarta, { baja_logica: false });
    } catch (err) {
      console.error('Error al reactivar el producto:', err);
    }
  }

  volver(): void {
    void this._router.navigate(['/admin']);
  }
}
