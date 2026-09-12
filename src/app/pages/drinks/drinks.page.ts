import { Component, inject, OnInit, signal } from '@angular/core';
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
import { RouterLink } from '@angular/router';
import { DrinkCardComponent } from './components/drink-card/drink-card.component';
import { Drink } from '@app/services';
import { SkeletonCardComponent } from './components/skeleton-card/skeleton-card.component';

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
  ],
})
export class DrinksPage implements OnInit {
  drinks = signal<any[]>([]);

  isLoading = signal<boolean>(false);

  private _drinkService = inject(Drink);

  async ngOnInit() {
    this.isLoading.set(true);

    const drinks = await this._drinkService.getList();

    this.isLoading.set(false);

    this.drinks.set(drinks);
  }
}
