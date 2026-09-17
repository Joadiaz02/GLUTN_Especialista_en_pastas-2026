import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonSearchbar, IonIcon, IonBackButton, IonButtons, IonToolbar, IonHeader, IonRouterLink, IonButton } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';

import { CartaItem, TipoCarta } from '../../models/carta.model';
import { Carta } from '@app/services';
import { Carrito } from '../carrito/carrito';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { BarraPedidoComponent } from '@app/components/ui/barra-pedido/barra-pedido.component';

const TITULOS: Record<TipoCarta, string> = {
  plato: 'Platos',
  bebida: 'Bebidas',
  postre: 'Postres'
};

const DEMORA_FOTO_MS = 3000;

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
    SpinnerLogoComponent,
    IonButton,
    BarraPedidoComponent
],
})
export class ProductosPage implements OnInit, OnDestroy {

  private route = inject(ActivatedRoute);
  public carrito = inject(Carrito);
  private cartaService = inject(Carta);
  private _fotoIntervalId: any = null;
  // punto 12 :
  //esta: el cliente pueden elegir los productos (con sus cantidades) para todos los comensales.
  //erificar que en todo momento esté visible (y con buen tamaño) el importe acumulado
  //Mostrar el tiempo total estimado de realización del pedido completo.
    
 
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

  indiceFoto = signal(0);

  fotoActual = computed(() => {
    const producto = this.productoActual();
    if (!producto) return '';

    const fotos = [producto.foto_1, producto.foto_2, producto.foto_3];
    return fotos[this.indiceFoto()];
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

    this.iniciarCicloFotos();
  }

  ngOnDestroy(): void {
    this.detenerCicloFotos();
  }

  private iniciarCicloFotos(): void {
    this.detenerCicloFotos();

    this._fotoIntervalId = setInterval(() => {
      this.indiceFoto.update(i => (i + 1) % 3);
    }, DEMORA_FOTO_MS);
  }

  private detenerCicloFotos(): void {
    if (this._fotoIntervalId !== null) {
      clearInterval(this._fotoIntervalId);
      this._fotoIntervalId = null;
    }
  }

  onBuscar(texto: string): void {
    this.textoBusqueda.set(texto);
    this.indiceActual.set(0); 
    this.indiceFoto.set(0);
  }

  siguiente(): void {
    if (this.haySiguiente()) {
      this.indiceActual.update(i => i + 1);
      this.indiceFoto.set(0);
    }
  }

  anterior(): void {
    if (this.hayAnterior()) {
      this.indiceActual.update(i => i - 1);
      this.indiceFoto.set(0);
    }
  }

  agregarAlCarrito(producto: CartaItem): void {
    this.carrito.agregar(producto);
  }

  quitarAlcarrito(producto: CartaItem):void{
    this.carrito.quitar(producto.id_carta);
  }

  cantidadEnCarrito(producto: CartaItem): number {
    return this.carrito.cantidadDe(producto.id_carta);
  }

  continuarPedido(): void {
  const resumen = {
    items: this.carrito.items(),
    total: this.carrito.importeTotal(),
    tiempoEstimado: this.carrito.tiempoTotalEstimado()
  };

    console.log('Pedido a guardar (todavía sin persistir):', resumen);

    // TODO: cuando exista la tabla de pedidos en Supabase,
    // acá va la llamada real: this.pedidosService.crearPedido(resumen)

     // o la ruta que corresponda al siguiente paso
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
