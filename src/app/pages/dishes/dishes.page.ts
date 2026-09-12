import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonIcon,
  ToastController,
} from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';
import { DishCardComponent } from './components/dish-card/dish-card.component';
import { Plato, Confirm } from '@app/services';
import { CartaItem } from '@app/models/carta.model';
import { SkeletonCardComponent } from './components/skeleton-card/skeleton-card.component';

@Component({
  selector: 'app-dishes',
  templateUrl: './dishes.page.html',
  styleUrls: ['./dishes.page.scss'],
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonButtons,
    RouterLink,
    DishCardComponent,
    IonIcon,
    SkeletonCardComponent,
  ],
})
export class DishesPage implements OnInit {
  dishes = signal<CartaItem[]>([]);

  isLoading = signal<boolean>(false);

  private _platoService = inject(Plato);
  private _confirm = inject(Confirm);
  private _toastController = inject(ToastController);
  private _router = inject(Router);

  async ngOnInit() {
    await this.cargarPlatos();
  }

  private async cargarPlatos(): Promise<void> {
    this.isLoading.set(true);

    const dishes = await this._platoService.getList();

    this.isLoading.set(false);

    this.dishes.set(dishes);
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

  async volver(): Promise<void> {
    const confirmado = await this._confirm.preguntar({
      titulo: '¿Salir de Platos?',
      mensaje: 'Vas a volver al panel de administración.',
      textoConfirmar: 'Salir',
      colorConfirmar: 'primary',
      icono: 'arrow-back-outline',
    });

    if (confirmado) {
      this._router.navigate(['/admin']);
    }
  }

  editar(item: CartaItem): void {
    this._router.navigate(['/admin/dishes/edit', item.id_carta]);
  }

  async destacar(item: CartaItem): Promise<void> {
    const activar = !item.sugerencia;

    const confirmado = await this._confirm.preguntar({
      titulo: activar ? '¿Marcar como destacado?' : '¿Quitar de destacados?',
      mensaje: activar
        ? `"${item.nombre}" va a aparecer en el slide de productos destacados del inicio.`
        : `"${item.nombre}" va a dejar de aparecer en el slide de productos destacados del inicio.`,
      textoConfirmar: activar ? 'Destacar' : 'Quitar',
      colorConfirmar: 'primary',
      icono: activar ? 'star' : 'star-outline',
    });

    if (!confirmado) return;

    await this._platoService.setSugerencia(item.id_carta, activar);

    await this.mostrarAviso(
      activar ? 'Plato destacado correctamente.' : 'Plato retirado de destacados.'
    );

    await this.cargarPlatos();
  }

  async darDeBaja(item: CartaItem): Promise<void> {
    const confirmado = await this._confirm.preguntar({
      titulo: '¿Dar de baja el plato?',
      mensaje: `"${item.nombre}" va a dejar de verse en la carta.`,
      textoConfirmar: 'Dar de baja',
      colorConfirmar: 'danger',
      icono: 'trash-outline',
    });

    if (!confirmado) return;

    await this._platoService.darDeBaja(item.id_carta);

    await this.mostrarAviso('Plato dado de baja correctamente.');

    await this.cargarPlatos();
  }
}
