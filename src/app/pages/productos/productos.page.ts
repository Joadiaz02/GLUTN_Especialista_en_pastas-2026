import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonContent,
  IonSearchbar,
  IonIcon,
  IonBackButton,
  IonButtons,
  IonToolbar,
  IonHeader
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';

import { CartaItem, TipoCarta } from '../../models/carta.model';
import { Carta } from '@app/services';
import { Carrito } from '../carrito/carrito';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';

const TITULOS: Record<TipoCarta, string> = {
  plato: 'Platos',
  bebida: 'Bebidas',
  postre: 'Postres'
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
    IonBackButton,
    IonSearchbar,
    IonIcon,
    SpinnerLogoComponent
  ],
})
export class ProductosPage implements OnInit {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private carrito = inject(Carrito);
  private cartaService = inject(Carta);

  // El tipo viene de la URL: /carta/plato, /carta/bebida, /carta/postre
  tipo = signal<TipoCarta>(
    (this.route.snapshot.paramMap.get('tipo') as TipoCarta) ?? 'plato'
  );

  titulo = computed(() => TITULOS[this.tipo()]);

  textoBusqueda = signal('');

  indiceActual = signal(0);

  isLoading = signal(false);

  productos = signal<CartaItem[]>([]);

  productosFiltrados = computed(() => {
    const texto = this.textoBusqueda().trim().toLowerCase();

    return this.productos()
      .filter(p => !texto || p.nombre.toLowerCase().includes(texto));
  });

  productoActual = computed(() => {
    const lista = this.productosFiltrados();
    const indice = Math.min(this.indiceActual(), Math.max(lista.length - 1, 0));
    return lista[indice] ?? null;
  });

  hayAnterior = computed(() => this.indiceActual() > 0);
  haySiguiente = computed(() => this.indiceActual() < this.productosFiltrados().length - 1);

  constructor() {
    addIcons({ addOutline, chevronBackOutline, chevronForwardOutline });
  }

  async ngOnInit(): Promise<void> {
    this.isLoading.set(true);

    const productos = await this.cartaService.getPorTipo(this.tipo());

    this.isLoading.set(false);

    this.productos.set(productos);
  }

  onBuscar(texto: string): void {
    this.textoBusqueda.set(texto);
    this.indiceActual.set(0); // al buscar, siempre arrancamos desde el primer resultado
  }

  siguiente(): void {
    if (this.haySiguiente()) {
      this.indiceActual.update(i => i + 1);
    }
  }

  anterior(): void {
    if (this.hayAnterior()) {
      this.indiceActual.update(i => i - 1);
    }
  }

  agregarAlCarrito(producto: CartaItem): void {
    this.carrito.agregar(producto.id_carta);
  }

  cantidadEnCarrito(producto: CartaItem): number {
    return this.carrito.cantidadDe(producto.id_carta);
  }

  // ============================
  // SWIPE (touch)
  // ============================

  private inicioX = 0;
  private readonly UMBRAL_SWIPE = 50;

  onTouchStart(evento: TouchEvent): void {
    this.inicioX = evento.touches[0].clientX;
  }

  onTouchEnd(evento: TouchEvent): void {
    const finX = evento.changedTouches[0].clientX;
    const delta = finX - this.inicioX;

    if (delta > this.UMBRAL_SWIPE) {
      this.anterior(); // deslizó hacia la derecha -> anterior
    } else if (delta < -this.UMBRAL_SWIPE) {
      this.siguiente(); // deslizó hacia la izquierda -> siguiente
    }
  }
}
