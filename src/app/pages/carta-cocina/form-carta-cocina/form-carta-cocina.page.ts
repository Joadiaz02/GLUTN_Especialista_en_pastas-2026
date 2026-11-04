import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { PrecioInput } from '@app/directives';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonFooter,
  ToastController,
  IonInput,
  IonTextarea,
  IonToggle,
  IonIcon,
} from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { timeOutline } from 'ionicons/icons';
import { UploaderComponent } from '../uploader/uploader.component';
import { Storage, CartaCocina, Confirm, Vibracion, TipoCocina } from '@app/services';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { VibrarErrores } from '@app/directives/vibrar-errores';
import { textoValido } from '@app/validators/texto';
import { CARTA_COCINA } from '../carta-cocina.config';

// alta y edición de platos y postres; con :id en la ruta edita
@Component({
  selector: 'app-form-carta-cocina',
  templateUrl: './form-carta-cocina.page.html',
  styleUrls: ['./form-carta-cocina.page.scss'],
  imports: [
    VibrarErrores,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    IonButtons,
    IonButton,
    IonFooter,
    IonInput,
    IonTextarea,
    IonToggle,
    IonIcon,
    ReactiveFormsModule,
    UploaderComponent,
    SpinnerLogoComponent,
    PrecioInput,
    ConfirmVolverComponent,
  ],
})
export class FormCartaCocinaPage implements OnInit {
  private _route = inject(ActivatedRoute);
  private _router = inject(Router);
  private _cartaCocina = inject(CartaCocina);
  private _storageService = inject(Storage);
  private _toastController = inject(ToastController);
  private _confirm = inject(Confirm);
  private _vibracion = inject(Vibracion);

  readonly tipo: TipoCocina = this._route.snapshot.data['tipo'] ?? 'plato';
  readonly config = CARTA_COCINA[this.tipo];

  private readonly _id = this._route.snapshot.paramMap.get('id');
  readonly esEdicion = this._id !== null;

  isLoading = signal<boolean>(false);
  cargandoProducto = signal<boolean>(this.esEdicion);

  // fotos guardadas, solo al editar
  fotosActuales = signal<(string | null)[]>([null, null, null]);

  // al editar las fotos son opcionales: si no se cambian quedan las de antes
  form = new FormGroup({
    title: new FormControl('', [Validators.required, textoValido(3, 60)]),
    description: new FormControl('', [Validators.required, textoValido(10, 250)]),
    preparation: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[0-9]+$/),
      Validators.min(1),
    ]),
    price: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[0-9]+(\.[0-9]{1,2})?$/),
      Validators.min(1),
    ]),
    sugerencia: new FormControl(false),
    images: new FormArray(
      [0, 1, 2].map(
        () => new FormControl<File | null>(null, this.esEdicion ? [] : [Validators.required])
      )
    ),
  });

  constructor() {
    addIcons({ timeOutline });
  }

  async ngOnInit(): Promise<void> {
    if (!this._id) return;

    const producto = await this._cartaCocina.getById(this.tipo, this._id);

    if (!producto) {
      await this._vibracion.error();

      const toast = await this._toastController.create({
        message: `No encontramos ese ${this.config.singular}. Puede que lo hayan borrado.`,
        duration: 5000,
        position: 'top',
        color: 'danger',
      });

      await toast.present();

      this._router.navigateByUrl(this.config.ruta);
      return;
    }

    this.form.setValue({
      title: producto.nombre,
      description: producto.descripcion,
      preparation: String(producto.tiempo_elaboracion),
      price: Number(producto.precio).toFixed(2),
      sugerencia: producto.sugerencia,
      images: [null, null, null],
    });

    this.fotosActuales.set([producto.foto_1, producto.foto_2, producto.foto_3]);

    this.cargandoProducto.set(false);
  }

  getFormControl(controlName: string) {
    return this.form.get(controlName);
  }

  get photosArray() {
    return this.form.controls.images as FormArray<FormControl<File | null>>;
  }

  onPhotoSelected(index: number, file: File) {
    this.photosArray.at(index).setValue(file);
  }

  volver(): void {
    this._router.navigate([this.config.ruta]);
  }

  // arma el aviso con lo que falta completar
  private async avisarFaltantes(): Promise<void> {
    const fotos = this.photosArray.controls.filter((control) => control.invalid).length;
    const campos = Object.entries(this.form.controls).some(
      ([nombre, control]) => nombre !== 'images' && control.invalid
    );

    const partes: string[] = [];
    if (fotos > 0) partes.push(fotos === 1 ? 'Falta 1 foto.' : `Faltan ${fotos} fotos.`);
    if (campos) partes.push('Revisá los campos marcados en rojo.');

    const toast = await this._toastController.create({
      message: partes.join(' '),
      duration: 4000,
      position: 'top',
      color: 'danger',
    });

    await toast.present();
  }

  async confirmarYGuardar(): Promise<void> {
    // si falta algo marca los campos, vibra y avisa qué revisar
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      await this._vibracion.error();
      await this.avisarFaltantes();
      return;
    }

    const confirmado = await this._confirm.preguntar(
      this.esEdicion
        ? {
            titulo: '¿Guardar los cambios?',
            mensaje: 'Los cambios van a quedar visibles para los clientes de inmediato.',
            textoConfirmar: 'Guardar',
            colorConfirmar: 'primary',
            icono: 'restaurant-outline',
          }
        : {
            titulo: `¿Guardar este ${this.config.singular}?`,
            mensaje: 'Se va a agregar a la carta y va a quedar visible para los clientes.',
            textoConfirmar: 'Guardar',
            colorConfirmar: 'primary',
            icono: 'restaurant-outline',
          }
    );

    if (!confirmado) return;

    await this.guardar();
  }

  private async guardar() {
    try {
      const data = this.form.getRawValue();

      this.isLoading.set(true);

      // sube solo las fotos nuevas
      const fotos: string[] = [];
      for (const [i, archivo] of data.images.entries()) {
        fotos.push(
          archivo
            ? await this._storageService.uploadImage(archivo)
            : (this.fotosActuales()[i] as string)
        );
      }

      const producto = {
        nombre: (data.title as string).trim(),
        descripcion: (data.description as string).trim(),
        tiempo_elaboracion: Number(data.preparation),
        precio: Number(data.price),
        foto_1: fotos[0],
        foto_2: fotos[1],
        foto_3: fotos[2],
        sugerencia: data.sugerencia ?? false,
      };

      if (this._id) {
        await this._cartaCocina.update(this.tipo, this._id, producto);
      } else {
        await this._cartaCocina.add(this.tipo, producto);
      }

      const nombre = this.config.singular.charAt(0).toUpperCase() + this.config.singular.slice(1);

      const toastOk = await this._toastController.create({
        message: `${nombre} ${this.esEdicion ? 'actualizado' : 'creado'} correctamente.`,
        duration: 3000,
        position: 'top',
        color: 'success',
      });

      await toastOk.present();

      this._router.navigateByUrl(this.config.ruta);
    } catch (error) {
      await this._vibracion.error();

      const toast = await this._toastController.create({
        message:
          'No pudimos completar la acción. Intentá nuevamente más tarde.',
        duration: 5000,
        position: 'top',
        color: 'danger',
      });

      await toast.present();
    } finally {
      this.isLoading.set(false);
    }
  }
}
