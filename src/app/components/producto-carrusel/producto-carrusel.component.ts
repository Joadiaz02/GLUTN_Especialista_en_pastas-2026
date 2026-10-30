import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  TemplateRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';

import {
  CommonModule,
  CurrencyPipe,
} from '@angular/common';

import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { timeOutline } from 'ionicons/icons';
import { CartaItem } from '@app/models/carta.model';
import { Carrito } from '@app/pages/carrito/carrito';
import { ClientsNavigationComponent } from 
'@app/pages/clients/components/clients-navigation/clients-navigation.component';

@Component({
  selector: 'app-producto-carrusel',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    ClientsNavigationComponent,
    IonIcon,
  ],
  templateUrl:
    './producto-carrusel.component.html',
  styleUrl:
    './producto-carrusel.component.scss',
})
export class ProductoCarruselComponent
  implements AfterViewInit, OnChanges, OnDestroy {

  constructor() {
    addIcons({ timeOutline });
  }

  @Input()
  productos: CartaItem[] = [];

  @Input()
  etiqueta = 'productos';

  
  // flechas y contador "1 de N" debajo de la tarjeta (igual que en Clientes)
  @Input()
  mostrarNavegacion = false;

  // precios con 2 decimales (listados de gestión)
  @Input()
  decimales = false;

  // botones propios para el pie de la tarjeta en las pantallas de gestión
  @Input()
  acciones: TemplateRef<{ $implicit: CartaItem }> | null = null;

  @ViewChild('productosViewport')
  productosViewport?: ElementRef<HTMLElement>;

  private readonly carrito =
    inject(Carrito);

  /* =====================================================
     ESTADO
  ===================================================== */

  indiceProducto =
    signal(0);

  indiceImagen =
    signal(0);

  /* =====================================================
     SCROLL
  ===================================================== */

  private scrollListener?:
    () => void;

  /* =====================================================
     AUTOPLAY
  ===================================================== */

  private autoplay:
    ReturnType<typeof setInterval> | null =
      null;

  /* =====================================================
     INIT
  ===================================================== */

  ngAfterViewInit(): void {

    const viewport =
      this.productosViewport
        ?.nativeElement;

    if (!viewport) {
      return;
    }

    this.scrollListener = () => {
      this.actualizarProductoPorCentro();
    };

    viewport.addEventListener(
      'scroll',
      this.scrollListener,
      {
        passive: true,
      }
    );

    requestAnimationFrame(() => {

      this.irAlProducto(
        0,
        false
      );

      this.iniciarAutoplay();

    });
  }

  ngOnChanges(): void {
    requestAnimationFrame(() => this.actualizarProductoPorCentro());
  }

  /* =====================================================
     DESTROY
  ===================================================== */

  ngOnDestroy(): void {

    const viewport =
      this.productosViewport
        ?.nativeElement;

    if (
      viewport &&
      this.scrollListener
    ) {

      viewport.removeEventListener(
        'scroll',
        this.scrollListener
      );

    }

    this.detenerAutoplay();
  }

  /* =====================================================
     PRODUCTO ACTUAL
  ===================================================== */

  get productoActual(): CartaItem | null {

    return (
      this.productos[
        this.indiceProducto()
      ] ?? null
    );
  }

  get cantidadProductos(): number {

    return this.productos.length;
  }

  /* =====================================================
     PRODUCTO ACTIVO
  ===================================================== */

  esProductoActivo(
    producto: CartaItem
  ): boolean {

    return (
      producto.id_carta ===
      this.productoActual?.id_carta
    );
  }

  /* =====================================================
     FOTOS
  ===================================================== */

  fotosDe(
    producto: CartaItem | null
  ): string[] {

    if (!producto) {
      return [];
    }

    return [
      producto.foto_1,
      producto.foto_2,
      producto.foto_3,
    ].filter(
      (
        foto
      ): foto is string =>
        Boolean(foto)
    );
  }

  cantidadImagenes(
    producto: CartaItem | null
  ): number {

    return this
      .fotosDe(producto)
      .length;
  }

  fotoActualDe(
    producto: CartaItem | null
  ): string {

    const fotos =
      this.fotosDe(producto);

    if (!fotos.length) {
      return '';
    }

    /*
     * Las tarjetas que no están activas
     * muestran siempre su primera foto.
     */
    if (
      producto?.id_carta !==
      this.productoActual?.id_carta
    ) {

      return fotos[0];
    }

    return (
      fotos[
        this.indiceImagen()
      ] ?? fotos[0]
    );
  }

  /* =====================================================
     NAVEGACIÓN PRODUCTOS
  ===================================================== */

  irAlProducto(
    indice: number,
    animado = true
  ): void {

    if (
      indice < 0 ||
      indice >=
        this.productos.length
    ) {

      return;
    }

    const viewport =
      this.productosViewport
        ?.nativeElement;

    if (!viewport) {
      return;
    }

    const tarjetas =
      Array.from(
        viewport.querySelectorAll(
          '.producto-slide'
        )
      ) as HTMLElement[];

    const tarjeta =
      tarjetas[indice];

    if (!tarjeta) {
      return;
    }

    /*
     * Actualizamos inmediatamente
     * el producto activo.
     */
    this.indiceProducto.set(
      indice
    );

    /*
     * Al cambiar de producto,
     * siempre comenzamos por
     * su primera imagen.
     */
    this.indiceImagen.set(0);

    /*
     * Centramos SOLO dentro del
     * viewport del carrusel.
     */
    const posicion =
      tarjeta.offsetLeft -
      (
        viewport.clientWidth -
        tarjeta.offsetWidth
      ) / 2;

    viewport.scrollTo({
      left: Math.max(
        0,
        posicion
      ),

      behavior:
        animado
          ? 'smooth'
          : 'auto',
    });

    this.reiniciarAutoplay();
  }

  siguienteProducto(): void {

    const siguiente =
      this.indiceProducto() + 1;

    if (
      siguiente >=
      this.productos.length
    ) {

      return;
    }

    this.irAlProducto(
      siguiente
    );
  }

  anteriorProducto(): void {

    const anterior =
      this.indiceProducto() - 1;

    if (
      anterior < 0
    ) {

      return;
    }

    this.irAlProducto(
      anterior
    );
  }

  /* =====================================================
     DETECTAR PRODUCTO ACTIVO
  ===================================================== */

    // Flechas del contador: dan la vuelta (del último vuelve al primero)
  irAlProductoAnteriorCircular(): void {
    const total = this.productos.length;

    if (total < 2) {
      return;
    }

    this.irAlProducto((this.indiceProducto() - 1 + total) % total);
  }

  irAlProductoSiguienteCircular(): void {
    const total = this.productos.length;

    if (total < 2) {
      return;
    }

    this.irAlProducto((this.indiceProducto() + 1) % total);
  }

  private actualizarProductoPorCentro(): void {

    const viewport =
      this.productosViewport
        ?.nativeElement;

    if (!viewport) {
      return;
    }

    const tarjetas =
      Array.from(
        viewport.querySelectorAll(
          '.producto-slide'
        )
      ) as HTMLElement[];

    if (!tarjetas.length) {
      return;
    }

    const centroViewport =
      viewport.scrollLeft +
      viewport.clientWidth / 2;

    let indiceMasCercano = 0;

    let distanciaMinima =
      Number.POSITIVE_INFINITY;

    tarjetas.forEach(
      (
        tarjeta,
        indice
      ) => {

        const centroTarjeta =
          tarjeta.offsetLeft +
          tarjeta.offsetWidth / 2;

        const distancia =
          Math.abs(
            centroTarjeta -
            centroViewport
          );

        if (
          distancia <
          distanciaMinima
        ) {

          distanciaMinima =
            distancia;

          indiceMasCercano =
            indice;
        }

      }
    );

    if (
      indiceMasCercano !==
      this.indiceProducto()
    ) {

      this.indiceProducto.set(
        indiceMasCercano
      );

      this.indiceImagen.set(0);

      this.reiniciarAutoplay();
    }
  }

  /* =====================================================
     IMÁGENES
  ===================================================== */

  anteriorImagen(): void {

    const cantidad =
      this.cantidadImagenes(
        this.productoActual
      );

    if (
      cantidad <= 1
    ) {

      return;
    }

    this.indiceImagen.update(
      (
        valor
      ) =>
        valor <= 0
          ? cantidad - 1
          : valor - 1
    );

    this.reiniciarAutoplay();
  }

  siguienteImagen(): void {

    const cantidad =
      this.cantidadImagenes(
        this.productoActual
      );

    if (
      cantidad <= 1
    ) {

      return;
    }

    this.indiceImagen.update(
      (
        valor
      ) =>
        (
          valor + 1
        ) % cantidad
    );

    this.reiniciarAutoplay();
  }

  seleccionarImagen(
    indice: number
  ): void {

    const cantidad =
      this.cantidadImagenes(
        this.productoActual
      );

    if (
      indice < 0 ||
      indice >= cantidad
    ) {

      return;
    }

    this.indiceImagen.set(
      indice
    );

    this.reiniciarAutoplay();
  }

  /* =====================================================
     CARRITO
  ===================================================== */

  agregar(
    producto: CartaItem
  ): void {

    this.carrito.agregar(
      producto
    );
  }

  quitar(
    producto: CartaItem
  ): void {

    this.carrito.quitar(
      producto.id_carta
    );
  }

  cantidadActual(
    producto: CartaItem
  ): number {

    return this.carrito.cantidadDe(
      producto.id_carta
    );
  }

  /* =====================================================
     AUTOPLAY
  ===================================================== */

  private iniciarAutoplay(): void {

    this.detenerAutoplay();

    this.autoplay =
      setInterval(
        () => {

          const cantidad =
            this.cantidadImagenes(
              this.productoActual
            );

          if (
            cantidad > 1
          ) {

            this.siguienteImagen();
          }

        },
        4000
      );
  }

  private reiniciarAutoplay(): void {

    this.iniciarAutoplay();
  }

  private detenerAutoplay(): void {

    if (
      this.autoplay !== null
    ) {

      clearInterval(
        this.autoplay
      );

      this.autoplay = null;
    }
  }
}