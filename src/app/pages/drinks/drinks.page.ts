import { Component, computed, inject, signal } from '@angular/core';
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
  IonSearchbar,
  ToastController,
} from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';
import { Drink, Confirm, Vibracion } from '@app/services';
import { CartaItem } from '@app/models/carta.model';
import { ProductoCarruselComponent } from '@app/components/producto-carrusel/producto-carrusel.component';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { addIcons } from 'ionicons';
import {
  addOutline,
  createOutline,
  refreshOutline,
  star,
  starOutline,
  trashOutline,
} from 'ionicons/icons';
import { toSignal } from '@angular/core/rxjs-interop';
import { HeaderComponent } from '@app/components/ui';

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
    IonButton,
    RouterLink,
    ProductoCarruselComponent,
    IonIcon,
    IonSearchbar,
    SpinnerLogoComponent,
    ConfirmVolverComponent,
    HeaderComponent
],
})
export class DrinksPage {
  textoBusqueda = signal('');

  private _drinkService = inject(Drink);
  private _confirm = inject(Confirm);
  private _toastController = inject(ToastController);
  private _vibracion = inject(Vibracion);
  private _router = inject(Router);

  // Fuente única de verdad: reacciona sola a los cambios de la base
  private drinksSignal = toSignal(this._drinkService.getListChanges(), {
    initialValue: null, // null = todavía no llegó el primer emit
  });

  drinks = computed(() => this.drinksSignal() ?? []);
  isLoading = computed(() => this.drinksSignal() === null);

  drinksFiltrados = computed(() => {
    const texto = this.textoBusqueda().trim().toLowerCase();
    return this.drinks().filter(
      (d) => !texto || d.nombre.toLowerCase().includes(texto)
    );
  });

  constructor() {
    addIcons({
      addOutline,
      createOutline,
      refreshOutline,
      star,
      'star-outline': starOutline,
      trashOutline,
    });
  }

  
  ionViewWillEnter(): void {
    void this._drinkService.refresh();
  }

  onBuscar(texto: string): void {
    this.textoBusqueda.set(texto);
  }

  private async mostrarAviso(mensaje: string): Promise<void> {
    const toast = await this._toastController.create({
      message: mensaje,
      duration: 3000,
      position: 'top',
      color: 'success',
    });
    await toast.present();
  }

  private async mostrarError(): Promise<void> {
    await this._vibracion.error();
    const toast = await this._toastController.create({
      message: 'No pudimos completar la acción. Intentá nuevamente más tarde.',
      duration: 5000,
      position: 'top',
      color: 'danger',
    });
    await toast.present();
  }

  volver(): void {
    this._router.navigate(['/admin']);
  }

  editar(item: CartaItem): void {
    this._router.navigate(['/admin/drinks/edit', item.id_carta]);
  }

  async destacar(item: CartaItem): Promise<void> {
    const activar = !item.sugerencia;

    const confirmado = await this._confirm.preguntar({
      titulo: activar ? '¿Marcar como destacada?' : '¿Quitar de destacadas?',
      mensaje: activar
        ? `"${item.nombre}" va a aparecer en el slide de productos destacados del inicio.`
        : `"${item.nombre}" va a dejar de aparecer en el slide de productos destacados del inicio.`,
      textoConfirmar: activar ? 'Destacar' : 'Quitar',
      colorConfirmar: 'primary',
      icono: activar ? 'star' : 'star-outline',
    });

    if (!confirmado) return;

    try {
      await this._drinkService.update(item.id_carta, { sugerencia: activar });
      await this.mostrarAviso(
        activar ? 'Bebida destacada correctamente.' : 'Bebida retirada de destacadas.'
      );
    } catch (error) {
      await this.mostrarError();
    }
  }

  async darDeBaja(item: CartaItem): Promise<void> {
    const confirmado = await this._confirm.preguntar({
      titulo: '¿Dar de baja la bebida?',
      mensaje: `"${item.nombre}" va a dejar de verse en la carta. Vas a poder reactivarla cuando quieras.`,
      textoConfirmar: 'Dar de baja',
      colorConfirmar: 'danger',
      icono: 'trash-outline',
    });

    if (!confirmado) return;

    try {
      await this._drinkService.update(item.id_carta, { baja_logica: true });
      await this.mostrarAviso('Bebida dada de baja correctamente.');
    } catch (error) {
      await this.mostrarError();
    }
  }

  async reactivar(item: CartaItem): Promise<void> {
    const confirmado = await this._confirm.preguntar({
      titulo: '¿Reactivar la bebida?',
      mensaje: `"${item.nombre}" va a volver a verse en la carta.`,
      textoConfirmar: 'Reactivar',
      colorConfirmar: 'primary',
      icono: 'refresh-outline',
    });

    if (!confirmado) return;

    try {
      await this._drinkService.update(item.id_carta, { baja_logica: false });
      await this.mostrarAviso('Bebida reactivada correctamente.');
    } catch (error) {
      await this.mostrarError();
    }
  }
}