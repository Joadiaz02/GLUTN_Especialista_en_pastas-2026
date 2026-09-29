import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonHeader, IonTitle, IonToolbar, IonButtons, IonContent, IonInput, IonFooter, IonButton, IonSpinner, ToastController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { Storage, Table } from '@app/services';
import { GtnUploader } from '@app/components';
import { Vibracion } from '@app/services/vibracion';
import { VibrarErrores } from '@app/directives';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
@Component({
  selector: 'app-edit-table',
  templateUrl: './edit-table.page.html',
  styleUrls: ['./edit-table.page.scss'],
  imports: [
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    ReactiveFormsModule,
    IonButtons,
    ConfirmVolverComponent,
    IonContent,
    IonInput,
    GtnUploader,
    IonFooter,
    IonButton,
    IonSpinner,
    VibrarErrores,
    SpinnerLogoComponent
],
})
export class EditTablePage implements OnInit {
  private _router = inject(Router);
  private _route = inject(ActivatedRoute);
  private _tableService = inject(Table);
  private _toastController = inject(ToastController);
  private _storageService = inject(Storage);
  private _vibracion = inject(Vibracion);
  isLoading = signal<boolean>(false);

  image = signal<string | null>(null);

  table = signal<any>(null);

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

  async ngOnInit() {
    const id = this._route.snapshot.paramMap.get('id') ?? '';
    
    const table = await this._tableService.getTableById(id)!;

    this.table.set(table);
    this.image.set(table.foto);

    this.form.setValue({
      number: table.numero,
      diners: table.capacidad,
      type: table.tipo,
      file: null
    });
  }

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

  volver(): void {
    void this._router.navigate(['admin', 'tables']);
  }

  async edit() {
    try {
      const data = this.form.getRawValue();

      this.isLoading.set(true);

      this.form.markAsPending();

      const image = data.file ? await this._storageService.uploadImage(data.file)
      : (this.image() as string);

      console.log(this.table().id)
      console.log(image)
      console.log(data)

      await this._tableService.update(this.table().id, {
        numero: data.number,
        capacidad: data.diners,
        foto: image,
        tipo: data.type,
        baja_logica: false
      });

      const toast = await this._toastController.create({
        message: 'La mesa se actualizo correctamente',
        duration: 5000,
        position: 'bottom',
      });

      await toast.present();

      this._router.navigateByUrl('/admin/tables');
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
