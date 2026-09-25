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
import { UploaderComponent } from '../../../dishes/components/create-dish/uploader/uploader.component';
import { Storage, Postre, Confirm, Vibracion } from '@app/services';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { VibrarErrores } from '@app/directives/vibrar-errores';

@Component({
  selector: 'app-edit-postre',
  templateUrl: './edit-postre.page.html',
  styleUrls: ['./edit-postre.page.scss'],
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
    ConfirmVolverComponent,
  ],
})
export class EditPostrePage implements OnInit {
  isLoading = signal<boolean>(false);
  isLoadingPostre = signal<boolean>(true);

  fotoActual1 = signal<string | null>(null);
  fotoActual2 = signal<string | null>(null);
  fotoActual3 = signal<string | null>(null);

  private _id = '';
  private _route = inject(ActivatedRoute);
  private _router = inject(Router);
  private _postreService = inject(Postre);
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
      new FormControl<File | null>(null),
      new FormControl<File | null>(null),
      new FormControl<File | null>(null),
    ]),
  });

  async ngOnInit(): Promise<void> {
    this._id = this._route.snapshot.paramMap.get('id') ?? '';

    const postre = this._id ? await this._postreService.getById(this._id) : null;

    if (!postre) {
      this._router.navigateByUrl('/admin/postres');
      return;
    }

    this.form.setValue({
      title: postre.nombre,
      description: postre.descripcion,
      preparation: String(postre.tiempo_elaboracion),
      price: String(postre.precio),
      sugerencia: postre.sugerencia,
      images: [null, null, null],
    });

    this.fotoActual1.set(postre.foto_1);
    this.fotoActual2.set(postre.foto_2);
    this.fotoActual3.set(postre.foto_3);

    this.isLoadingPostre.set(false);
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
    this._router.navigate(['/admin/postres']);
  }

  async confirmarYGuardar(): Promise<void> {
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

      await this._postreService.update(this._id, {
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
        message: 'Postre actualizado correctamente.',
        duration: 3000,
        position: 'top',
        color: 'success',
      });

      await toastOk.present();

      this._router.navigateByUrl('/admin/postres');
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
