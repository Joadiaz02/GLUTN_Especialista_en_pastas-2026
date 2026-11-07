import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { IonButton, IonContent, IonIcon, IonModal, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { LimitesListaDirective } from '@app/directives/limites-lista.directive';
import { Vibracion } from '@app/services';
import { Factura, FacturaDelRestaurante } from '@app/services/factura/factura';
import { HeaderComponent } from '@app/components/ui/header/header.component';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { LoadingOverlayComponent } from '@app/components/ui/loading-overlay/loading-overlay.component';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

interface DiaCalendario {
  fecha: Date | null;
  numero: number;
  futuro: boolean;
  hoy: boolean;
  elegido: boolean;
}

function inicioDelDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

@Component({
  selector: 'app-facturacion',
  standalone: true,
  templateUrl: './facturacion.page.html',
  styleUrls: ['./facturacion.page.scss'],
  imports: [HeaderComponent, CurrencyPipe, DatePipe, IonButton, IonContent, IonIcon, IonModal, SpinnerLogoComponent, LoadingOverlayComponent,
    LimitesListaDirective
  ],
})
export class FacturacionPage {
  private _factura = inject(Factura);
  private _vibracion = inject(Vibracion);
  private _toastController = inject(ToastController);

  facturas = signal<FacturaDelRestaurante[]>([]);
  cargando = signal(false);
  descargando = signal<string | null>(null);

  // día que se está mirando; arranca en hoy
  dia = signal(inicioDelDia(new Date()));

  esHoy = computed(() => this.dia().getTime() === inicioDelDia(new Date()).getTime());

  // la app no tiene cargado el idioma de fechas en español: el nombre del día se arma acá
  nombreDia = computed(() => DIAS[this.dia().getDay()]);

  totalDelDia = computed(() => this.facturas().reduce((suma, f) => suma + f.total, 0));

  // calendario: se abre al tocar la fecha, con el mismo estilo que productos destacados
  mostrarCalendario = signal(false);

  // primer día del mes que muestra el calendario
  mesCalendario = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  readonly diasDeLaSemana = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

  tituloMes = computed(() => `${MESES[this.mesCalendario().getMonth()]} ${this.mesCalendario().getFullYear()}`);

  esMesActual = computed(() => {
    const mes = this.mesCalendario();
    const hoy = new Date();
    return mes.getFullYear() === hoy.getFullYear() && mes.getMonth() === hoy.getMonth();
  });

  // días del mes en semanas de lunes a domingo; los huecos del principio van vacíos
  diasDelMes = computed<DiaCalendario[]>(() => {
    const mes = this.mesCalendario();
    const hoy = inicioDelDia(new Date()).getTime();
    const elegido = this.dia().getTime();
    const huecos = (mes.getDay() + 6) % 7;
    const cantidad = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
    const dias: DiaCalendario[] = Array.from({ length: huecos }, () => ({ fecha: null, numero: 0, futuro: false, hoy: false, elegido: false }));

    for (let numero = 1; numero <= cantidad; numero++) {
      const fecha = new Date(mes.getFullYear(), mes.getMonth(), numero);
      dias.push({
        fecha,
        numero,
        futuro: fecha.getTime() > hoy,
        hoy: fecha.getTime() === hoy,
        elegido: fecha.getTime() === elegido,
      });
    }

    return dias;
  });

  constructor() {
    // las mismas flechas que productos destacados
    addIcons({
      'chevron-back-outline': chevronBackOutline,
      'chevron-forward-outline': chevronForwardOutline,
    });
  }

  ionViewWillEnter(): void {
    void this.cargar();
  }

  cambiarDia(dias: number): void {
    if (dias > 0 && this.esHoy()) {
      return;
    }

    const nuevo = new Date(this.dia());
    nuevo.setDate(nuevo.getDate() + dias);
    this.dia.set(nuevo);
    void this.cargar();
  }

  abrirCalendario(): void {
    const dia = this.dia();
    this.mesCalendario.set(new Date(dia.getFullYear(), dia.getMonth(), 1));
    this.mostrarCalendario.set(true);
  }

  cerrarCalendario(): void {
    this.mostrarCalendario.set(false);
  }

  cambiarMes(meses: number): void {
    // no se puede ir más allá del mes actual
    if (meses > 0 && this.esMesActual()) {
      return;
    }

    const mes = this.mesCalendario();
    this.mesCalendario.set(new Date(mes.getFullYear(), mes.getMonth() + meses, 1));
  }

  // elige el día, cierra el calendario y busca las facturas de esa fecha
  elegirDia(dia: DiaCalendario): void {
    if (!dia.fecha || dia.futuro) {
      return;
    }

    this.dia.set(dia.fecha);
    this.mostrarCalendario.set(false);
    void this.cargar();
  }

  async descargar(factura: FacturaDelRestaurante): Promise<void> {
    if (this.descargando()) {
      return;
    }

    this.descargando.set(factura.idTicket);

    try {
      await this._factura.descargar(factura.idPedido);
    } catch (error) {
      // cerrar el menú de compartir no es un error
      if (!String(error).toLowerCase().includes('cancel')) {
        void this._vibracion.error();
        await this.avisar('No pudimos descargar la factura. Intentá nuevamente.');
      }
    } finally {
      this.descargando.set(null);
    }
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);

    try {
      this.facturas.set(await this._factura.listarDelDia(this.dia()));
    } catch (error) {
      void this._vibracion.error();
      await this.avisar(error instanceof Error ? error.message : 'No pudimos cargar las facturas.');
    } finally {
      this.cargando.set(false);
    }
  }

  private async avisar(mensaje: string): Promise<void> {
    const toast = await this._toastController.create({
      message: mensaje,
      duration: 5000,
      position: 'top',
      color: 'danger',
    });

    await toast.present();
  }
}
