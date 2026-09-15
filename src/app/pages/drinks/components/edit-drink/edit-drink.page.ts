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
import { Drink, Storage } from '@app/services';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { GtnUploader } from '@app/components';

@Component({
  selector: 'app-edit-drink',
  templateUrl: './edit-drink.page.html',
  styleUrls: ['./edit-drink.page.scss'],
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
    IonCheckbox,
    ConfirmVolverComponent,
    GtnUploader,
  ],
})
export class EditDrinkPage {
  isLoading = signal<boolean>(false);

  isLoadingDrink = signal<boolean>(false);

  fotoActual1 = signal<string | null>(null);
  fotoActual2 = signal<string | null>(null);
  fotoActual3 = signal<string | null>(null);

  drink = signal<any>(null);

  private _id = '';
  private _route = inject(ActivatedRoute);
  private _router = inject(Router);
  private _storageService = inject(Storage);
  private _toastController = inject(ToastController);

  private _drinkService = inject(Drink);

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
    const id = this._route.snapshot.paramMap.get('id') ?? '';

    const drink = await this._drinkService.getById(id)!;

    console.log(drink);

    this.drink.set(drink);

    this.form.setValue({
      title: drink.nombre,
      description: drink.descripcion,
      preparation: String(drink.tiempo_elaboracion),
      price: String(drink.precio),
      sugerencia: drink.sugerencia,
      images: [null, null, null],
    });
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

  async volver() {
    await this._router.navigate(['/admin/drinks']);
  }

  async confirmarYGuardar(): Promise<void> {
    // const confirmado = await this._confirm.preguntar({
    //   titulo: '¿Guardar los cambios?',
    //   mensaje:
    //     'Los cambios van a quedar visibles para los clientes de inmediato.',
    //   textoConfirmar: 'Guardar',
    //   colorConfirmar: 'primary',
    //   icono: 'restaurant-outline',
    // });
    // if (!confirmado) return;
    // await this.guardar();
  }

  private async guardar() {
    // try {
    //   const data = this.form.getRawValue();
    //   this.isLoading.set(true);
    //   const nuevoFoto1 = data.images[0];
    //   const nuevoFoto2 = data.images[1];
    //   const nuevoFoto3 = data.images[2];
    //   const foto1 = nuevoFoto1
    //     ? await this._storageService.uploadImage(nuevoFoto1)
    //     : (this.fotoActual1() as string);
    //   const foto2 = nuevoFoto2
    //     ? await this._storageService.uploadImage(nuevoFoto2)
    //     : (this.fotoActual2() as string);
    //   const foto3 = nuevoFoto3
    //     ? await this._storageService.uploadImage(nuevoFoto3)
    //     : (this.fotoActual3() as string);
    //   await this._platoService.update(this._id, {
    //     nombre: data.title as string,
    //     descripcion: data.description as string,
    //     tiempo_elaboracion: Number(data.preparation),
    //     precio: Number(data.price),
    //     foto_1: foto1,
    //     foto_2: foto2,
    //     foto_3: foto3,
    //     sugerencia: data.sugerencia ?? false,
    //   });
    //   await this._vibracion.confirmacion();
    //   const toastOk = await this._toastController.create({
    //     message: 'Plato actualizado correctamente.',
    //     duration: 3000,
    //     position: 'top',
    //     color: 'success',
    //   });
    //   await toastOk.present();
    //   this._router.navigateByUrl('/admin/dishes');
    // } catch (error) {
    //   await this._vibracion.error();
    //   const toast = await this._toastController.create({
    //     message:
    //       'No pudimos completar la acción. Intentá nuevamente más tarde.',
    //     duration: 5000,
    //     position: 'top',
    //     color: 'danger',
    //   });
    //   await toast.present();
    // } finally {
    //   this.isLoading.set(false);
    // }
  }
}
