import {
  Component,
  inject,
  signal,
} from '@angular/core';

import { CommonModule } from '@angular/common';

import { VibrarErrores } from '@app/directives/vibrar-errores';

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
  IonToggle,
  NavController,
} from '@ionic/angular';
import { PrecioInput } from '@app/directives';
import {
  Storage,
  Drink,
  Vibracion,
} from '@app/services';

import { Router } from '@angular/router';

import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';

import { GtnUploader } from '@app/components';

import { LoadingOverlayComponent } from '@app/components/ui/loading-overlay/loading-overlay.component';
import { HeaderComponent } from '@app/components/ui';


@Component({
  selector: 'app-create-drink',
  templateUrl: './create-drink.page.html',
  styleUrls: ['./create-drink.page.scss'],

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
    GtnUploader,
    IonToggle,
    ConfirmVolverComponent,
    VibrarErrores,
    PrecioInput,
    LoadingOverlayComponent,
    HeaderComponent
  ],
})
export class CreateDrinkPage {
  uploading = signal(false);
  photoPreview = signal<string | null>(null);
  isLoading = signal<boolean>(false);

   private _navCtrl = inject(NavController); 

  private readonly _router = inject(Router);

  private readonly _drinkService = inject(Drink);

  private readonly _storageService = inject(Storage);

  private readonly _toastController = inject(ToastController);

  private readonly _vibracion = inject(Vibracion);


  form = new FormGroup({

      title:
        new FormControl(
          '',
          Validators.required
        ),

      description:
        new FormControl(
          '',
          Validators.required
        ),

      preparation:
        new FormControl(
          '',
          Validators.required
        ),

      price: new FormControl('', [
        Validators.required,
        Validators.pattern(/^[0-9]+(\.[0-9]{1,2})?$/),
        Validators.min(1),
      ]),

      ml:
        new FormControl(
          '',
          [
            Validators.required,
            Validators.pattern(
              /^[0-9]+$/
            ),
            Validators.min(1),
          ]
        ),

      contieneAlcohol:
        new FormControl(false),

      sugerencia:
        new FormControl(false),

      images:
        new FormArray([
          new FormControl<File | null>(
            null,
            Validators.required
          ),

          new FormControl<File | null>(
            null,
            Validators.required
          ),

          new FormControl<File | null>(
            null,
            Validators.required
          ),
        ]),
    });


  volver(): void {
    void this._router.navigate(
      ['/admin/drinks']
    );

  }

  getFormControl(
    controlName: string
  ) {

    return this.form.get(
      controlName
    );

  }

  get photosArray() {
    return this.form.controls.images as FormArray< FormControl<File | null>>;
  }


  onPhotoSelected(
    index: number,
    file: File
  ): void {
    this.photosArray.at(index).setValue(file);
    this.photosArray.at(index).markAsDirty();

  }


  async create(): Promise<void> {

    if (
      this.form.invalid
    ) {

      this.form.markAllAsTouched();

      await this._vibracion.error();

      const toast =
        await this._toastController.create({
          message: 'Completá todos los campos obligatorios y cargá las tres imágenes.',
          duration: 3500,
          position: 'top',
        });

      await toast.present();

      return;
    }


    this.isLoading.set(true);


    try {
      const data = this.form.getRawValue();


      const image01 = await this._storageService.uploadImage(
          data.images[0] as File
        );


      const image02 = await this._storageService.uploadImage(
          data.images[1] as File
        );


      const image03 =
        await this._storageService.uploadImage( data.images[2] as File );

      await this._drinkService.add({

        nombre: data.title,

        descripcion: data.description,

        precio: data.price,

        tipo: 'bebida',

        foto_1: image01,

        foto_2: image02,

        foto_3: image03,

        tiempo_elaboracion: data.preparation,

        sugerencia: data.sugerencia ?? false,

        destacado: false,

        medida_ml: data.ml,

        tiene_alcohol: data.contieneAlcohol ?? false,

        baja_logica: false,
      });


      await this._vibracion.confirmacion();


      const toast = await this._toastController.create({
          message: 'La bebida se creó correctamente.',

          duration: 3000,

          position: 'bottom',

        });


      await toast.present();


      // await this._router.navigateByUrl(
      //   '/admin/drinks'
      // );

      await this._navCtrl.navigateRoot('/admin/drinks', {
        animated: true,
        animationDirection: 'back',
        replaceUrl: true,
      });
    } catch (error) {

      console.error(
        'Error al crear bebida:',
        error
      );


      await this._vibracion.error();


      const toast =
        await this._toastController.create({
          message: 'No pudimos completar la acción. Intentá nuevamente más tarde.',
          duration: 5000,
          position: 'top',

        });

      await toast.present();

    } finally {

      this.isLoading.set(false);
    }
  }
}