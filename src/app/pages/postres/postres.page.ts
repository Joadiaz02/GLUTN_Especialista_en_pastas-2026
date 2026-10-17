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
  IonSearchbar,
  ToastController,
} from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';
import { Postre, Confirm, Vibracion } from '@app/services';
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

@Component({
  selector: 'app-postres',
  templateUrl: './postres.page.html',
  styleUrls: ['./postres.page.scss'],
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
  ],
})
export class PostresPage  {
  postres = signal<CartaItem[]>([]);

  isLoading = signal<boolean>(false);

  textoBusqueda = signal('');

  private _postreService = inject(Postre);
  private _confirm = inject(Confirm);
  private _toastController = inject(ToastController);
  private _vibracion = inject(Vibracion);
  private _router = inject(Router);

  postresFiltrados = computed(() => {
    const texto = this.textoBusqueda().trim().toLowerCase();

    return this.postres().filter(
      (p) => !texto || p.nombre.toLowerCase().includes(texto)
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


  async ionViewWillEnter(): Promise<void> {
    await this.cargarPostres();
  }

  private async cargarPostres(): Promise<void> {
    this.isLoading.set(true);

    const postres = await this._postreService.getList();

    this.isLoading.set(false);

    this.postres.set(postres);
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
    this._router.navigate(['/admin/postres/edit', item.id_carta]);
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

    try {
      await this._postreService.setSugerencia(item.id_carta, activar);

      await this._vibracion.confirmacion();

      await this.mostrarAviso(
        activar ? 'Postre destacado correctamente.' : 'Postre retirado de destacados.'
      );

      await this.cargarPostres();
    } catch (error) {
      await this.mostrarError();
    }
  }

  async darDeBaja(item: CartaItem): Promise<void> {
    const confirmado = await this._confirm.preguntar({
      titulo: '¿Dar de baja el postre?',
      mensaje: `"${item.nombre}" va a dejar de verse en la carta. Vas a poder reactivarlo cuando quieras.`,
      textoConfirmar: 'Dar de baja',
      colorConfirmar: 'danger',
      icono: 'trash-outline',
    });

    if (!confirmado) return;

    try {
      await this._postreService.darDeBaja(item.id_carta);

      await this._vibracion.confirmacion();

      await this.mostrarAviso('Postre dado de baja correctamente.');

      await this.cargarPostres();
    } catch (error) {
      await this.mostrarError();
    }
  }

  async reactivar(item: CartaItem): Promise<void> {
    const confirmado = await this._confirm.preguntar({
      titulo: '¿Reactivar el postre?',
      mensaje: `"${item.nombre}" va a volver a verse en la carta.`,
      textoConfirmar: 'Reactivar',
      colorConfirmar: 'primary',
      icono: 'refresh-outline',
    });

    if (!confirmado) return;

    try {
      await this._postreService.reactivar(item.id_carta);

      await this._vibracion.confirmacion();

      await this.mostrarAviso('Postre reactivado correctamente.');

      await this.cargarPostres();
    } catch (error) {
      await this.mostrarError();
    }
  }
}
