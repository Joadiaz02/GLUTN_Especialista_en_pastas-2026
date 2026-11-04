import { Component, effect, inject, OnDestroy, signal, viewChild, ElementRef, afterNextRender } from '@angular/core';
import { Pedido } from '@app/services/pedido/pedido';
import { Carrito } from '../carrito/carrito';
import { IonHeader, IonToolbar, IonButtons, IonContent, IonButton, ToastController, IonFooter, IonIcon } from '@ionic/angular';
import { LoadingOverlayComponent } from '@app/components/ui/loading-overlay';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { Router } from '@angular/router';
import { ConfirmDialogComponent } from '@app/components/ui/confirm-cartel/confirm-cartel.component';
import { CurrencyPipe } from '@angular/common';
import { Auth, MesaCliente } from '@app/services';
import { Vibracion } from '@app/services';
import { CartaItem } from '@app/models/carta.model';

// Alto mínimo (px) que debe tener la foto de cada tarjeta.
// Más alto = menos tarjetas por pantalla pero fotos más grandes.
const FOTO_MIN = 72;

@Component({
  selector: 'app-pedido',
  templateUrl: './pedido.component.html',
  styleUrls: ['./pedido.component.scss'],
  imports: [IonHeader, IonToolbar, IonButtons, IonContent, ConfirmVolverComponent, ConfirmDialogComponent,
    CurrencyPipe, IonButton, IonFooter, IonIcon, LoadingOverlayComponent],
})
export class PedidoComponent implements OnDestroy {

  pedido = inject(Pedido);
  carrito = inject(Carrito);
  root = inject(Router);
  private authService = inject(Auth);
  private toastController = inject(ToastController);
  private vibracion = inject(Vibracion);
  private mesaCliente = inject(MesaCliente);

  private contenedor = viewChild<ElementRef<HTMLElement>>('contenedor');
  private lista = viewChild<ElementRef<HTMLElement>>('lista');
  private resumen = viewChild<ElementRef<HTMLElement>>('resumen');

  private observador?: ResizeObserver;
  private ajusteFrame = 0;

  constructor() {
    // cada vez que cambian los productos, se recalcula
    effect(() => {
      this.carrito.items();
      setTimeout(() => this.programarAjuste());
    });

    // y cuando cambia el tamaño de la pantalla
    afterNextRender(() => {
      const contenedor = this.contenedor()?.nativeElement;

      if (contenedor && typeof ResizeObserver !== 'undefined') {
        this.observador = new ResizeObserver(() => this.programarAjuste());
        this.observador.observe(contenedor);
      }

      // la tipografía cambia el alto del texto cuando termina de cargar
      void document.fonts?.ready.then(() => this.programarAjuste());
      this.programarAjuste();
    });
  }

  ngOnDestroy(): void {
    this.observador?.disconnect();
    cancelAnimationFrame(this.ajusteFrame);
  }

  private programarAjuste(): void {
    cancelAnimationFrame(this.ajusteFrame);
    this.ajusteFrame = requestAnimationFrame(() => this.ajustarTarjetas());
  }

  /**
   * Calcula el alto de cada tarjeta (--alto-card):
   *
   *  - Mide el espacio libre: pantalla − header − resumen − botón.
   *  - Mide el alto del texto y los controles (lo único que no puede achicarse).
   *  - La foto se queda con todo lo que sobra, con un mínimo de FOTO_MIN.
   *  - Si los productos entran todos, se reparten el alto completo: no queda
   *    ningún hueco, ni con 1 producto ni con 2.
   *  - Si no entran, se decide cuántas caben completas y la lista scrollea
   *    de a una tarjeta, sin que quede ninguna cortada arriba ni abajo.
   *
   * Se mide con el contenido real, así que también funciona con la letra
   * agrandada del sistema.
   */
  private ajustarTarjetas(): void {
    const contenedor = this.contenedor()?.nativeElement;
    const lista = this.lista()?.nativeElement;
    const resumen = this.resumen()?.nativeElement;

    if (!contenedor || !lista || !resumen) return;

    const tarjetas = Array.from(lista.querySelectorAll<HTMLElement>('.producto-card'));
    const total = tarjetas.length;

    if (total === 0) {
      lista.style.removeProperty('--alto-card');
      return;
    }

    const estiloContenedor = getComputedStyle(contenedor);
    const gap = parseFloat(estiloContenedor.rowGap) || 0;
    const util =
      contenedor.clientHeight -
      (parseFloat(estiloContenedor.paddingTop) || 0) -
      (parseFloat(estiloContenedor.paddingBottom) || 0);

    if (util <= 0) return;

    // alto del texto + controles (el más alto de todos) y del marco de la tarjeta
    const altoInfo = tarjetas.reduce((max, tarjeta) => {
      const info = tarjeta.querySelector<HTMLElement>('.item-info');
      return Math.max(max, info?.offsetHeight ?? 0);
    }, 0);

    const estiloTarjeta = getComputedStyle(tarjetas[0]);
    const marco =
      (parseFloat(estiloTarjeta.paddingTop) || 0) +
      (parseFloat(estiloTarjeta.paddingBottom) || 0) +
      (parseFloat(estiloTarjeta.rowGap) || 0);

    const minTarjeta = Math.ceil(altoInfo + marco + FOTO_MIN);

    // espacio para las tarjetas = todo menos el resumen
    const disponible = util - resumen.offsetHeight - gap;

    const caben = Math.max(1, Math.floor((disponible + gap) / (minTarjeta + gap)));
    const visibles = Math.min(caben, total);
    const alto = Math.max(minTarjeta, Math.floor((disponible - (visibles - 1) * gap) / visibles));

    lista.style.setProperty('--alto-card', `${alto}px`);
  }

  continuarPedido() {
    return {
      items: this.carrito.items(),
      total: this.carrito.importeTotal(),
      tiempoEstimado: this.carrito.tiempoTotalEstimado(),
    };
  }

  // evita el doble toque mientras se guarda
  enviando = signal(false);

  // marca que el carrito se vació por el envío, no por el cliente
  private enviado = false;

  async solicitarPedido(): Promise<void> {
    if (this.enviando()) return;

    this.enviando.set(true);

    try {
      const usuario = this.authService.usuarioActual() ?? await this.authService.obtenerUsuarioActual();

      if (!usuario) {
        await this.vibracion.error();
        await this.mostrarToast('Tu sesión expiró. Volvé a ingresar.', 'warning');
        return;
      }

      // vuelve a buscar la mesa por si la asignaron recién
      if (!this.mesaCliente.id()) {
        await this.mesaCliente.actualizar();
      }

      const idMesa = this.mesaCliente.id();

      if (!idMesa) {
        await this.vibracion.error();
        await this.mostrarToast('Todavía no estás en tu mesa. Escaneá el QR de la mesa que te asignó el metre.', 'warning');
        return;
      }

      const idEnEdicion = this.pedido.idPedidoEnEdicion();

      this.enviado = true;

      if (idEnEdicion) {
        await this.pedido.actualizar_pedido(idEnEdicion);
      } else {
        await this.pedido.crear_pedido(idMesa, usuario.id, '');
      }

      await this.mostrarToast('¡Pedido enviado! El mozo lo va a confirmar en breve.', 'success');

      void this.root.navigate(['/home'], { replaceUrl: true });
    } catch (error) {
      this.enviado = false;
      await this.vibracion.error();
      console.error('Error al confirmar el pedido:', error);
      await this.mostrarToast('No pudimos enviar el pedido. Intentá de nuevo.', 'danger');
    } finally {
      this.enviando.set(false);
    }
  }

  private async mostrarToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 3000, position: 'top', color });
    await toast.present();
  }

  agregarProducto(producto: CartaItem): void {
    this.carrito.agregar(producto);
  }

  quitarProducto(producto: CartaItem): void {
    this.carrito.quitar(producto.id_carta);
  }

  eliminarProducto(producto: CartaItem): void {
    this.carrito.eliminar(producto.id_carta);
  }

  volver() {
    this.root.navigate(['/carta']);
  }

  async cerrarSesion(): Promise<void> {
    await this.authService.logout();

    localStorage.removeItem('mesa');

    const toast = await this.toastController.create({
      message: 'Sesión cerrada correctamente.',
      duration: 3000,
      position: 'top',
      color: 'success'
    });
    await toast.present();

    void this.root.navigate(['/login']);
  }
}