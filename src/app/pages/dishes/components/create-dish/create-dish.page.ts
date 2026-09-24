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
import { UploaderComponent } from './uploader/uploader.component';
import { Storage, Plato, Confirm, Vibracion } from '@app/services';
import { Router } from '@angular/router';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';

@Component({
  selector: 'app-create-dish',
  templateUrl: './create-dish.page.html',
  styleUrls: ['./create-dish.page.scss'],
  imports: [
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
    ConfirmVolverComponent,
  ],
})
export class CreateDishPage {
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
    title: new FormControl('', Validators.required),
    description: new FormControl('', Validators.required),
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

  async confirmarYGuardar(): Promise<void> {
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
        nombre: data.title as string,
        descripcion: data.description as string,
        tiempo_elaboracion: Number(data.preparation),
        precio: Number(data.price),
        foto_1: foto1,
        foto_2: foto2,
        foto_3: foto3,
        sugerencia: data.sugerencia ?? false,
      });

      await this._vibracion.confirmacion();

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
