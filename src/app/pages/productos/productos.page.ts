import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  IonContent,
  IonSearchbar,
  IonButtons,
  IonToolbar,
  IonHeader,
  ToastController,
} from '@ionic/angular';

import { ActivatedRoute, Router } from '@angular/router';

import { CartaItem, TipoCarta } from '../../models/carta.model';

import {
  Auth,
  Carta,
  Vibracion,
} from '@app/services';

import { Carrito } from '../carrito/carrito';

import { SpinnerLogoComponent } from
  '@app/components/ui/spinner-logo/spinner-logo.component';

import { BarraPedidoComponent } from
  '@app/components/ui/barra-pedido/barra-pedido.component';

import { ConfirmVolverComponent } from
  '@app/components/ui/confirm-volver/confirm-volver.component';

import { ConfirmDialogComponent } from
  '@app/components/ui/confirm-cartel/confirm-cartel.component';

import { ProductoCarruselComponent } from
  '@app/components/producto-carrusel/producto-carrusel.component';


const TITULOS: Record<TipoCarta, string> = {
  plato: 'Platos',
  bebida: 'Bebidas',
  postre: 'Postres',
};


@Component({
  selector: 'app-productos',

  standalone: true,

  templateUrl: './productos.page.html',

  styleUrls: ['./productos.page.scss'],

  imports: [
    CommonModule,

    IonContent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonSearchbar,

    SpinnerLogoComponent,

    BarraPedidoComponent,

    ConfirmVolverComponent,

    ConfirmDialogComponent,

    ProductoCarruselComponent,
  ],
})
export class ProductosPage implements OnInit {

  private router = inject(Router);

  private route = inject(ActivatedRoute);

  public carrito = inject(Carrito);

  private cartaService = inject(Carta);

  private authService = inject(Auth);

  private toastController = inject(ToastController);

  private vibracion = inject(Vibracion);


  tipo = signal<TipoCarta>(
    (this.route.snapshot.paramMap.get('tipo') as TipoCarta)
    ?? 'plato'
  );


  titulo = computed(() =>
    TITULOS[this.tipo()]
  );


  textoBusqueda = signal('');


  isLoading = signal(false);


  productos = signal<CartaItem[]>([]);


  productosFiltrados = computed(() => {

    const texto =
      this.textoBusqueda()
        .trim()
        .toLowerCase();

    return this.productos().filter(
      (producto) =>
        !texto ||
        producto.nombre
          .toLowerCase()
          .includes(texto)
    );

  });


  async ngOnInit(): Promise<void> {

    this.isLoading.set(true);

    try {

      const productos =
        await this.cartaService.getPorTipo(
          this.tipo()
        );

      this.productos.set(productos);

    } catch (error) {

      void this.vibracion.error();

      const toast =
        await this.toastController.create({
          message:
            error instanceof Error
              ? error.message
              : 'No pudimos cargar la carta.',
          duration: 5000,
          position: 'top',
          color: 'danger',
        });

      await toast.present();

    } finally {

      this.isLoading.set(false);

    }
  }


  onBuscar(texto: string): void {

    this.textoBusqueda.set(texto);

  }


  volver(): void {

    this.router.navigate(['/carta']);

  }


  async cerrarSesion(): Promise<void> {

    await this.authService.logout();

    localStorage.removeItem('mesa');

    const toast =
      await this.toastController.create({
        message:
          'Sesión cerrada correctamente.',

        duration: 3000,

        position: 'top',

        color: 'success',
      });

    await toast.present();

    void this.router.navigate(['/login']);

  }

}