import { Component, inject, signal } from '@angular/core';
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
  IonToggle,
} from '@ionic/angular';
import { UploaderComponent } from './uploader/uploader.component';
import { Storage, Plato, Confirm, Vibracion } from '@app/services';
import { Router } from '@angular/router';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { VibrarErrores } from '@app/directives/vibrar-errores';
import { textoValido } from '@app/validators/texto';

@Component({
  selector: 'app-create-dish',
  templateUrl: './create-dish.page.html',
  styleUrls: ['./create-dish.page.scss'],
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
    IonToggle,
    ConfirmVolverComponent,
  ],
})
export class CreateDishPage  {
  uploading = signal(false);
  photoPreview = signal<string | null>(null);
  isLoading = signal<boolean>(false);

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
      new FormControl<File | null>(null, Validators.required),
      new FormControl<File | null>(null, Validators.required),
      new FormControl<File | null>(null, Validators.required),
    ]),
  });

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
      titulo: '¿Guardar este plato?',
      mensaje: 'Se va a agregar a la carta y va a quedar visible para los clientes.',
      textoConfirmar: 'Guardar',
      colorConfirmar: 'primary',
      icono: 'restaurant-outline',
    });

    if (!confirmado) return;

    await this.create();
  }

  private async create() {
    try {
      const data = this.form.getRawValue();

      this.isLoading.set(true);

      this.form.markAsPending();

      const foto1 = await this._storageService.uploadImage(
        data.images[0] as File
      );

      const foto2 = await this._storageService.uploadImage(
        data.images[1] as File
      );

      const foto3 = await this._storageService.uploadImage(
        data.images[2] as File
      );

      await this._platoService.add({
        nombre: (data.title as string).trim(),
        descripcion: (data.description as string).trim(),
        tiempo_elaboracion: Number(data.preparation),
        precio: Number(data.price),
        foto_1: foto1,
        foto_2: foto2,
        foto_3: foto3,
        sugerencia: data.sugerencia ?? false,
      });

      // sin sonido al guardar por ahora
      // await this._vibracion.confirmacion();

      const toastOk = await this._toastController.create({
        message: 'Plato creado correctamente.',
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
