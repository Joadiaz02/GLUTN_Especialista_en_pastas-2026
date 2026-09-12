import { Component, computed, inject, signal } from '@angular/core';
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

import { Producto } from '../../models/productos.model';
import { Carrito } from '../carrito/carrito';

// TODO: esto es data simulada. Cuando exista la tabla "carta" en
// Supabase (ver esquema del UML), reemplazar por un servicio propio
// (ej. Carta.getList()) filtrado por tipo, en vez de este array hardcodeado.
const PRODUCTOS_MOCK: Producto[] = [
  {
    id: 1,
    nombre: 'Ravioles de ricota',
    descripcion: 'Pasta rellena casera con salsa a elección, espolvoreados con queso parmesano.',
    precio: 8500,
    tiempoElaboracion: 20,
    tipo: 'comida',
    fotos: [
      'assets/images/productos/ravioles-1.jpg',
      'assets/images/productos/ravioles-2.jpg',
      'assets/images/productos/ravioles-3.jpg'
    ]
  },
  {
    id: 2,
    nombre: 'Fideos con salsa bolognesa',
    descripcion: 'Fideos frescos con salsa de carne casera, cocidos a la manera tradicional italiana.',
    precio: 7900,
    tiempoElaboracion: 15,
    tipo: 'comida',
    fotos: [
      'assets/images/productos/fideos-1.jpg',
      'assets/images/productos/fideos-2.jpg',
      'assets/images/productos/fideos-3.jpg'
    ]
  },
  {
    id: 3,
    nombre: 'Sorrentinos de jamón y queso',
    descripcion: 'Sorrentinos rellenos de jamón cocido y queso, con salsa fileto casera.',
    precio: 9200,
    tiempoElaboracion: 18,
    tipo: 'comida',
    fotos: [
      'assets/images/productos/sorrentinos-1.jpg',
      'assets/images/productos/sorrentinos-2.jpg',
      'assets/images/productos/sorrentinos-3.jpg'
    ]
  },
  {
    id: 4,
    nombre: 'Limonada',
    descripcion: 'Limonada casera con menta fresca y hielo.',
    precio: 2500,
    tiempoElaboracion: 5,
    tipo: 'bebida',
    fotos: [
      'assets/images/productos/limonada-1.jpg',
      'assets/images/productos/limonada-2.jpg',
      'assets/images/productos/limonada-3.jpg'
    ]
  },
  {
    id: 5,
    nombre: 'Agua con gas',
    descripcion: 'Botella de agua mineral con gas, 500ml.',
    precio: 1800,
    tiempoElaboracion: 1,
    tipo: 'bebida',
    fotos: [
      'assets/images/productos/agua-1.jpg',
      'assets/images/productos/agua-2.jpg',
      'assets/images/productos/agua-3.jpg'
    ]
  },
  {
    id: 6,
    nombre: 'Copa de vino tinto',
    descripcion: 'Copa de vino tinto de la casa, malbec.',
    precio: 3200,
    tiempoElaboracion: 2,
    tipo: 'bebida',
    fotos: [
      'assets/images/productos/vino-1.jpg',
      'assets/images/productos/vino-2.jpg',
      'assets/images/productos/vino-3.jpg'
    ]
  },
  {
    id: 7,
    nombre: 'Tiramisú',
    descripcion: 'Tiramisú casero con café, mascarpone y cacao.',
    precio: 4500,
    tiempoElaboracion: 10,
    tipo: 'postre',
    fotos: [
      'assets/images/productos/tiramisu-1.jpg',
      'assets/images/productos/tiramisu-2.jpg',
      'assets/images/productos/tiramisu-3.jpg'
    ]
  },
  {
    id: 8,
    nombre: 'Panna cotta',
    descripcion: 'Panna cotta con salsa de frutos rojos.',
    precio: 4200,
    tiempoElaboracion: 8,
    tipo: 'postre',
    fotos: [
      'assets/images/productos/pannacotta-1.jpg',
      'assets/images/productos/pannacotta-2.jpg',
      'assets/images/productos/pannacotta-3.jpg'
    ]
  }
];

const TITULOS: Record<Producto['tipo'], string> = {
  comida: 'Platos',
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
    IonIcon
  ],
})
export class ProductosPage {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private carrito = inject(Carrito);

  // El tipo viene de la URL: /carta/comida, /carta/bebida, /carta/postre
  tipo = signal<Producto['tipo']>(
    (this.route.snapshot.paramMap.get('tipo') as Producto['tipo']) ?? 'comida'
  );

  titulo = computed(() => TITULOS[this.tipo()]);

  textoBusqueda = signal('');

  indiceActual = signal(0);

  productosFiltrados = computed(() => {
    const texto = this.textoBusqueda().trim().toLowerCase();

    return PRODUCTOS_MOCK
      .filter(p => p.tipo === this.tipo())
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

  agregarAlCarrito(producto: Producto): void {
    this.carrito.agregar(producto.id);
  }

  cantidadEnCarrito(producto: Producto): number {
    return this.carrito.cantidadDe(producto.id);
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
