import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CartaCocina, Confirm, Vibracion, TipoCocina } from '@app/services';
import { CartaItem } from '@app/models/carta.model';
import { ProductoCarruselComponent } from '@app/components/producto-carrusel/producto-carrusel.component';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { CARTA_COCINA } from './carta-cocina.config';
import { addIcons } from 'ionicons';
import {
  addOutline,
  createOutline,
  refreshOutline,
  star,
  starOutline,
  trashOutline,
} from 'ionicons/icons';

// listado de platos o postres según la ruta
@Component({
  selector: 'app-carta-cocina',
  templateUrl: './carta-cocina.page.html',
  styleUrls: ['./carta-cocina.page.scss'],
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    IonButtons,
    IonButton,
    RouterLink,
    ProductoCarruselComponent,
    IonIcon,
    SpinnerLogoComponent,
    ConfirmVolverComponent,
  ],
})
export class CartaCocinaPage {
  private _route = inject(ActivatedRoute);
  private _cartaCocina = inject(CartaCocina);
  private _confirm = inject(Confirm);
  private _toastController = inject(ToastController);
  private _vibracion = inject(Vibracion);
  private _router = inject(Router);

  readonly tipo: TipoCocina = this._route.snapshot.data['tipo'] ?? 'plato';
  readonly config = CARTA_COCINA[this.tipo];

  productos = signal<CartaItem[]>([]);

  isLoading = signal<boolean>(false);

  textoBusqueda = signal('');

  productosFiltrados = computed(() => {
    const texto = this.textoBusqueda().trim().toLowerCase();

    return this.productos().filter(
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
    await this.cargar();
  }

  private async cargar(): Promise<void> {
    this.isLoading.set(true);

    const productos = await this._cartaCocina.getList(this.tipo);

    this.isLoading.set(false);

    this.productos.set(productos);
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
    this._router.navigate([this.config.ruta, 'edit', item.id_carta]);
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
      await this._cartaCocina.setSugerencia(this.tipo, item.id_carta, activar);

      await this.mostrarAviso(
        activar
          ? `${this.nombre()} destacado correctamente.`
          : `${this.nombre()} retirado de destacados.`
      );

      await this.cargar();
    } catch (error) {
      await this.mostrarError();
    }
  }

  async darDeBaja(item: CartaItem): Promise<void> {
    const confirmado = await this._confirm.preguntar({
      titulo: `¿Dar de baja el ${this.config.singular}?`,
      mensaje: `"${item.nombre}" va a dejar de verse en la carta. Vas a poder reactivarlo cuando quieras.`,
      textoConfirmar: 'Dar de baja',
      colorConfirmar: 'danger',
      icono: 'trash-outline',
    });

    if (!confirmado) return;

    try {
      await this._cartaCocina.darDeBaja(this.tipo, item.id_carta);

      await this.mostrarAviso(`${this.nombre()} dado de baja correctamente.`);

      await this.cargar();
    } catch (error) {
      await this.mostrarError();
    }
  }

  async reactivar(item: CartaItem): Promise<void> {
    const confirmado = await this._confirm.preguntar({
      titulo: `¿Reactivar el ${this.config.singular}?`,
      mensaje: `"${item.nombre}" va a volver a verse en la carta.`,
      textoConfirmar: 'Reactivar',
      colorConfirmar: 'primary',
      icono: 'refresh-outline',
    });

    if (!confirmado) return;

    try {
      await this._cartaCocina.reactivar(this.tipo, item.id_carta);

      await this.mostrarAviso(`${this.nombre()} reactivado correctamente.`);

      await this.cargar();
    } catch (error) {
      await this.mostrarError();
    }
  }

  // "Plato" o "Postre" al principio de un aviso
  private nombre(): string {
    const { singular } = this.config;
    return singular.charAt(0).toUpperCase() + singular.slice(1);
  }
}
