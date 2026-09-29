import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Vibracion } from '@app/services/vibracion';
import {
  FormArray,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonFooter, ToastController, IonInput, IonToggle, IonTextarea } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { Drink, Storage } from '@app/services';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { GtnUploader } from '@app/components';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { VibrarErrores } from '@app/directives';

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
    IonToggle,
    ConfirmVolverComponent,
    GtnUploader,
    SpinnerLogoComponent,
    IonTextarea,
    VibrarErrores
],
})
export class EditDrinkPage implements OnInit {
  isLoading = signal<boolean>(false);

  isLoadingDrink = signal<boolean>(false);

  fotoActual1 = signal<string | null>(null);
  fotoActual2 = signal<string | null>(null);
  fotoActual3 = signal<string | null>(null);

  idDrink = signal<string>('');

  drink = signal<any>(null);

  private _route = inject(ActivatedRoute);
  private _router = inject(Router);
  private _storageService = inject(Storage);
  private _toastController = inject(ToastController);
  private _vibracion = inject(Vibracion);
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
    ml: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[0-9]+$/),
      Validators.min(1),
    ]),
    contieneAlcohol: new FormControl(false),
    sugerencia: new FormControl(false),
    images: new FormArray([
      new FormControl<File | null>(null),
      new FormControl<File | null>(null),
      new FormControl<File | null>(null),
    ]),
  });

  async ngOnInit(): Promise<void> {
    const id = this._route.snapshot.paramMap.get('id') ?? '';

    this.idDrink.set(id);
    this.isLoadingDrink.set(true);

    try {
      const drink = await this._drinkService.getById(id)!;

      this.drink.set(drink);

      this.fotoActual1.set(drink.foto_1);
      this.fotoActual2.set(drink.foto_2);
      this.fotoActual3.set(drink.foto_3);

      this.form.setValue({
        title: drink.nombre,
        description: drink.descripcion,
        preparation: String(drink.tiempo_elaboracion),
        price: String(drink.precio),
        ml: String(drink.medida_ml),
        contieneAlcohol: drink.tiene_alcohol ?? false,
        sugerencia: drink.sugerencia,
        images: [null, null, null],
      });
    } finally {
      this.isLoadingDrink.set(false);
    }
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

  private async resolverFoto(
    nuevaImagen: File | null,
    fotoActual: string | null
  ): Promise<string> {
    return nuevaImagen
      ? await this._storageService.uploadImage(nuevaImagen)
      : (fotoActual as string);
  }

  async update() {
    try {
      const data = this.form.getRawValue();

      this.isLoading.set(true);

      this.form.markAsPending();

      const [foto1, foto2, foto3] = await Promise.all([
        this.resolverFoto(data.images[0], this.fotoActual1()),
        this.resolverFoto(data.images[1], this.fotoActual2()),
        this.resolverFoto(data.images[2], this.fotoActual3()),
      ]);

      await this._drinkService.update(this.idDrink(), {
        nombre: data.title,
        descripcion: data.description,
        tiempo_elaboracion: Number(data.preparation),
        precio: Number(data.price),
        medida_ml: Number(data.ml),
        foto_1: foto1,
        foto_2: foto2,
        foto_3: foto3,
        tiene_alcohol: data.contieneAlcohol ?? false,
        sugerencia: data.sugerencia ?? false,
      });

      const toast = await this._toastController.create({
        message: 'La bebida se actualizo correctamente',
        duration: 5000,
        position: 'bottom',
      });

      await toast.present();

      this._router.navigateByUrl('/admin/drinks');
    } catch (error) {
      await this._vibracion.error();
      const toast = await this._toastController.create({
        message:
          'No pudimos completar la acción. Intentá nuevamente más tarde.',
        duration: 5000,
        position: 'top',
      });

      await toast.present();
    } finally {
      this.isLoading.set(false);
    }
  }
}
