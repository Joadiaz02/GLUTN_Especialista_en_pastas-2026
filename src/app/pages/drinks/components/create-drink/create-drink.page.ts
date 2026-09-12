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
  IonSpinner,
} from '@ionic/angular';
import { UploaderComponent } from './uploader/uploader.component';
import { Storage, Drink } from '@app/services';
import { Router } from '@angular/router';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';

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
    UploaderComponent,
    IonSpinner,
    ConfirmVolverComponent
],
})
export class CreateDrinkPage {
  uploading = signal(false);
  photoPreview = signal<string | null>(null);
  isLoading = signal<boolean>(false);

  private _router = inject(Router);
  private _drinkService = inject(Drink);
  private _storageService = inject(Storage);
  private _toastController = inject(ToastController);

  form = new FormGroup({
    title: new FormControl('', Validators.required),
    description: new FormControl('', Validators.required),
    preparation: new FormControl('', Validators.required),
    price: new FormControl('', Validators.required),
    images: new FormArray([
      new FormControl<File | null>(null, Validators.required),
      new FormControl<File | null>(null, Validators.required),
      new FormControl<File | null>(null, Validators.required),
    ]),
  });

  volver(): void {
    
    void this._router.navigate(['/admin/drinks']);
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

  async create() {
    try {
      const data = this.form.getRawValue();

      this.isLoading.set(true);

      this.form.markAsPending();

      const image01 = await this._storageService.uploadImage(
        data.images[0] as File
      );

      const image02 = await this._storageService.uploadImage(
        data.images[1] as File
      );

      const image03 = await this._storageService.uploadImage(
        data.images[2] as File
      );

      await this._drinkService.add({
        titulo: data.title,
        descripcion: data.description,
        tiempo_estimado: data.preparation,
        precio: data.price,
        imagen_1: image01,
        imagen_2: image02,
        imagen_3: image03,
      });

      this._router.navigateByUrl('/admin/drinks');
    } catch (error) {
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
