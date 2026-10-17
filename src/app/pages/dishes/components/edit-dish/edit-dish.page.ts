import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormControl,
  FormGroup,
  FormsModule,
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
  IonCheckbox,
} from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { UploaderComponent } from '../create-dish/uploader/uploader.component';
import { Storage, Plato, Confirm, Vibracion } from '@app/services';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { VibrarErrores } from '@app/directives/vibrar-errores';
import { textoValido } from '@app/validators/texto';

@Component({
  selector: 'app-edit-dish',
  templateUrl: './edit-dish.page.html',
  styleUrls: ['./edit-dish.page.scss'],
  imports: [
    VibrarErrores,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonButtons,
    IonButton,
    IonFooter,
    IonInput,
    ReactiveFormsModule,
    UploaderComponent,
    SpinnerLogoComponent,
    IonCheckbox,
    PrecioInput,
    ConfirmVolverComponent,
  ],
})
export class EditDishPage implements OnInit {
  isLoading = signal<boolean>(false);
  isLoadingPlato = signal<boolean>(true);

  fotoActual1 = signal<string | null>(null);
  fotoActual2 = signal<string | null>(null);
  fotoActual3 = signal<string | null>(null);

  private _id = '';
  private _route = inject(ActivatedRoute);
  private _router = inject(Router);
  private _platoService = inject(Plato);
  private _storageService = inject(Storage);
  private _toastController = inject(ToastController);
  private _confirm = inject(Confirm);
  private _vibracion = inject(Vibracion);

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
    images: new FormArray([
      new FormControl<File | null>(null),
      new FormControl<File | null>(null),
      new FormControl<File | null>(null),
    ]),
  });

  async ngOnInit(): Promise<void> {
    this._id = this._route.snapshot.paramMap.get('id') ?? '';

    const plato = this._id ? await this._platoService.getById(this._id) : null;

    if (!plato) {
      await this._vibracion.error();

      const toast = await this._toastController.create({
        message: 'No encontramos ese plato. Puede que lo hayan borrado.',
        duration: 5000,
        position: 'top',
        color: 'danger',
      });

      await toast.present();

      this._router.navigateByUrl('/admin/dishes');
      return;
    }

    this.form.setValue({
      title: plato.nombre,
      description: plato.descripcion,
      preparation: String(plato.tiempo_elaboracion),
      price: Number(plato.precio).toFixed(2),
      sugerencia: plato.sugerencia,
      images: [null, null, null],
    });

    this.fotoActual1.set(plato.foto_1);
    this.fotoActual2.set(plato.foto_2);
    this.fotoActual3.set(plato.foto_3);

    this.isLoadingPlato.set(false);
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
    this._router.navigate(['/admin/dishes']);
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

    const confirmado = await this._confirm.preguntar({
      titulo: '¿Guardar los cambios?',
      mensaje: 'Los cambios van a quedar visibles para los clientes de inmediato.',
      textoConfirmar: 'Guardar',
      colorConfirmar: 'primary',
      icono: 'restaurant-outline',
    });

    if (!confirmado) return;

    await this.guardar();
  }

  private async guardar() {
    try {
      const data = this.form.getRawValue();

      this.isLoading.set(true);

      const nuevoFoto1 = data.images[0];
      const nuevoFoto2 = data.images[1];
      const nuevoFoto3 = data.images[2];

      const foto1 = nuevoFoto1
        ? await this._storageService.uploadImage(nuevoFoto1)
        : (this.fotoActual1() as string);

      const foto2 = nuevoFoto2
        ? await this._storageService.uploadImage(nuevoFoto2)
        : (this.fotoActual2() as string);

      const foto3 = nuevoFoto3
        ? await this._storageService.uploadImage(nuevoFoto3)
        : (this.fotoActual3() as string);

      await this._platoService.update(this._id, {
        nombre: (data.title as string).trim(),
        descripcion: (data.description as string).trim(),
        tiempo_elaboracion: Number(data.preparation),
        precio: Number(data.price),
        foto_1: foto1,
        foto_2: foto2,
        foto_3: foto3,
        sugerencia: data.sugerencia ?? false,
      });

      await this._vibracion.confirmacion();

      const toastOk = await this._toastController.create({
        message: 'Plato actualizado correctamente.',
        duration: 3000,
        position: 'top',
        color: 'success',
      });

      await toastOk.present();

      this._router.navigateByUrl('/admin/dishes');
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
