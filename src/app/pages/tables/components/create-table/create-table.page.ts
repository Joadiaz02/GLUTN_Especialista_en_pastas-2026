import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonFooter, IonButton, IonInput, IonSpinner, ToastController, NavController } from '@ionic/angular';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { Router } from '@angular/router';
import { GtnUploader } from '@app/components';
import { Storage, Table } from '@app/services';
import { Vibracion } from '@app/services/vibracion';
import { VibrarErrores } from '@app/directives';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';

type TipoMesa = 'vip' | 'estandar' | 'movilidad_reducida';

@Component({
  selector: 'app-create-table',
  templateUrl: './create-table.page.html',
  styleUrls: ['./create-table.page.scss'],
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    CommonModule,
    ReactiveFormsModule,
    ConfirmVolverComponent,
    IonFooter,
    IonButton,
    IonInput,
    GtnUploader,
    IonSpinner,
    VibrarErrores,
    SpinnerLogoComponent
],
})
export class CreateTablePage {
  private _router = inject(Router);
  private _tableService = inject(Table);
  private _storageService = inject(Storage);
  private _toastController = inject(ToastController);
  private _vibracion = inject(Vibracion);
   private _navCtrl = inject(NavController); 
  isLoading = signal<boolean>(false);

  form = new FormGroup({
    number: new FormControl('', Validators.required),
    diners: new FormControl(1, [Validators.required, Validators.min(1), Validators.max(20)]),
    type: new FormControl<any | null>(null, Validators.required),
    file: new FormControl<File | null>(null, Validators.required)
  });

  readonly types: any[] = [
    { type: 'estandar', value: 'Estándar', },
    { type: 'vip_movilidad_reducida', value: 'VIP con Movilidad reducida' },
    { type: 'vip', value: 'VIP', },
    { type: 'movilidad_reducida', value: 'Movilidad reducida' },
  ];

  getFormControl(controlName: string) {
    return this.form.get(controlName);
  }

  incrementDiners(): void {
    const current = this.form.get('diners')?.value || 2;
    const newValue = Math.min(current + 1, 20);

    this.form.patchValue({ diners: newValue });
  }

  decrementDiners(): void {
    const current = this.form.get('diners')?.value || 2;

    const newValue = Math.max(current - 1, 1);
    this.form.patchValue({ diners: newValue });
  }

  selectType(value: any): void {
    this.form.patchValue({ type: value });
  }

  onPhotoSelected(index: number, file: File) {
    this.form.patchValue({ file: file })
  }

  async create(): Promise<void> {
    try {
      const data = this.form.getRawValue();

      this.isLoading.set(true)

      this.form.markAsPending();

      const image = await this._storageService.uploadImage(
        data.file as File
      );

      await this._tableService.add({
        numero: data.number,
        capacidad: data.diners,
        foto: image,
        tipo: data.type,
        baja_logica: false
      })

      const toast = await this._toastController.create({
        message:
          'La mesa se creo correctamente',
        duration: 5000,
        position: 'bottom',
      });

      await toast.present();

      // await this._router.navigate(['/admin/tables']);
      await this._navCtrl.navigateRoot('/admin/tables', {
        animated: true,
        animationDirection: 'back',
        replaceUrl: true,
      });
    } catch {
      await this._vibracion.error();
      const toast = await this._toastController.create({
        message:
          'No pudimos completar la acción. Intentá nuevamente más tarde.',
        duration: 5000,
        position: 'top',
      });

      await toast.present();
    } finally {
      this.isLoading.set(false)
    }
  }

  volver(): void {
    void this._router.navigate(['/admin/tables']);
  }
}