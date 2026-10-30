import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonIcon, ToastController, IonButton, IonInput, IonFooter } from '@ionic/angular';
import { HeaderComponent } from '@app/components/ui';
import { Storage, User, Vibracion } from '@app/services';
import { BarcodeFormat, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { GtnUploader } from '@app/components';
import { ActivatedRoute, Router } from '@angular/router';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { CuilFormat, DniFormat } from '@app/directives';
import { cuilDniMatchValidator } from '@app/validators';

const NAME_PATTERN =
  /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;
const DNI_PATTERN = /^\d{8}$/;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,64}$/;

@Component({
  selector: 'app-edit-employee',
  templateUrl: './edit-employee.page.html',
  styleUrls: ['./edit-employee.page.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonInput,
    HeaderComponent,
    IonIcon,
    IonFooter,
    GtnUploader,
    SpinnerLogoComponent,
    DniFormat, CuilFormat
],
})
export class EditEmployeePage {
    private _toastController = inject(ToastController);
  private _vibracion = inject(Vibracion);
  private _router = inject(Router);
  private _route = inject(ActivatedRoute);
  private _employeeRepository = inject(User);
  private _storageService = inject(Storage);

  readonly types: any[] = [
    { type: 'metre' },
    { type: 'cantinero' },
    { type: 'cocinero' },
    { type: 'mozo' },
  ];

  typeSelected = signal('');

  scanning = false;
  scanError: string | null = null;

  isLoading = signal(false)

  employee = signal<any>(null);

  image = signal<string | null>(null);

  async ngOnInit() {
        this.isLoading.set(true)
    const id = this._route.snapshot.paramMap.get('id') ?? '';
    
    const employee = await this._employeeRepository.getById(id);

    if (!employee) {
      await this.avisarNoEncontrado();
      return;
    }

    this.employee.set(employee);
    this.image.set(employee.avatar);

    this.form.setValue({
      name: employee.nombre,
      lastName: employee.apellido,
      dni: employee.documento,
      cuil: employee.cuil,
      role: employee.perfil,
      file: null
    });

    this.typeSelected.set(employee.perfil);

    this.isLoading.set(false)
  }

  // si lo borraron o el enlace es viejo, avisa y vuelve al listado
  private async avisarNoEncontrado(): Promise<void> {
    await this._vibracion.error();

    const toast = await this._toastController.create({
      message: 'No encontramos ese empleado. Puede que lo hayan borrado.',
      duration: 5000,
      position: 'top',
      color: 'danger',
    });

    await toast.present();

    await this._router.navigateByUrl('/admin/employees');
  }

  form = new FormGroup({
    file: new FormControl<File | null>(null, Validators.required),
    name: new FormControl('', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(50),
      Validators.pattern(NAME_PATTERN),
    ]),

    lastName: new FormControl('', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(50),
      Validators.pattern(NAME_PATTERN),
    ]),
    
    cuil: new FormControl('', [Validators.required]),

    dni: new FormControl('', [
      Validators.required,
      Validators.pattern(DNI_PATTERN),
    ]),

    role: new FormControl<any | null>(null, Validators.required),
  }, { validators: cuilDniMatchValidator });

    get formGroup(): FormGroup {
    return this.form as FormGroup;
  }

  async edit() {
    // El botón no depende de form.valid (la foto es opcional al editar),
    // por eso se revisan acá solo los datos del CUIL y el DNI.
    if (
      this.getFormControl('cuil')?.invalid ||
      this.getFormControl('dni')?.invalid ||
      this.form.hasError('cuilDniMismatch')
    ) {
      this.form.markAllAsTouched();
      await this._vibracion.error();

      const toast = await this._toastController.create({
        message: 'Revisá el CUIL y el DNI antes de guardar.',
        duration: 5000,
        position: 'top',
      });

      await toast.present();

      return;
    }

    try {
      const data = this.form.getRawValue();

      this.isLoading.set(true);

      this.form.markAsPending();

      const image = data.file ? await this._storageService.uploadImage(data.file)
      : (this.image() as string);

      console.log(this.employee().id)
      console.log(image)
      console.log(data)

      await this._employeeRepository.update(this.employee().id, {
        nombre: data.name,
        apellido: data.lastName,
        documento: data.dni,
        cuil: data.cuil,
        perfil: data.role,
        avatar: image,
      });

      const toast = await this._toastController.create({
        message: 'El empleado se actualizo correctamente',
        duration: 5000,
        position: 'bottom',
      });

      await toast.present();

      this._router.navigateByUrl('/admin/employees');
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

  getFormControl(controlName: string) {
    return this.form.get(controlName);
  }

    selectType(value: any): void {
    this.typeSelected.set(value);

    console.log(value)

    this.getFormControl('role')?.setValue(value);
  }

    onPhotoSelected(index: number, file: File) {
    this.form.patchValue({ file: file })
  }

  async scanDNI(): Promise<void> {
    this.scanError = null;

    try {
      this.scanning = true;

      const permission = await BarcodeScanner.checkPermissions();

      if (permission.camera !== 'granted') {
        const requested = await BarcodeScanner.requestPermissions();

        if (requested.camera !== 'granted') {
          const toast = await this._toastController.create({
            message: 'Necesitamos acceso a la cámara para escanear el DNI.',
            duration: 5000,
            position: 'top',
          });

          await toast.present();

          return;
        }
      }

      const { available } =
        await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();

      if (!available) {
        this.scanning = true;

        await BarcodeScanner.installGoogleBarcodeScannerModule();
      }

      const { barcodes } = await BarcodeScanner.scan({
        formats: [BarcodeFormat.Pdf417],
      });

      console.log("personal-step.page.ts 90")
      console.log(barcodes)
      console.log(barcodes[0])
      console.log(barcodes[0]?.rawValue)
      console.log("personal-step.page.ts 90")

      if (barcodes.length === 0) {
        const toast = await this._toastController.create({
          message: 'No se detectó ningún código. Probá de nuevo.',
          duration: 5000,
          position: 'top',
        });

        await toast.present();

        return;
      }

      this.parseBarcode(barcodes[0].rawValue);
    } catch (err) {
      await this._vibracion.error();
      const toast = await this._toastController.create({
        message: 'Ocurrió un problema al escanear. Intentá nuevamente.',
        duration: 5000,
        position: 'top',
      });

      await toast.present();
    } finally {
      this.scanning = false;
    }
  }

  private parseBarcode(raw: any): void {
    console.log('personal-step.page.ts 119');
    console.log(raw);

    const fields = raw.split('@');
    console.log('personal-step.page.ts 123');
    console.log(fields);

    const parsed = this.extractDniData(raw);

    if (!parsed) {
      this.scanError = 'El código escaneado no tiene el formato esperado.';
      return;
    }

    this.scanError = null;

    this.formGroup.patchValue({
      lastName: parsed.lastName,
      name: parsed.name,
      dni: parsed.dni,
      cuil: this.calculateCuil(parsed.dni, parsed.gender),
    });
  }

  private extractDniData(raw: string) {
    if (raw.includes('@')) {
      return this.parseNewDni(raw);
    }

    if (raw.includes('"')) {
      return this.parseOldDni(raw);
    }

    return null;
  }

  private parseNewDni(raw: string) {
    const fields = raw.split('@');

    if (fields.length < 5) return null;

    const dni = fields[4]?.trim() ?? '';

    if (!/^\d{7,8}$/.test(dni)) return null;

    return {
      lastName: fields[1]?.trim() ?? '',
      name: fields[2]?.trim() ?? '',
      gender: fields[3]?.trim().toUpperCase() ?? '',
      dni,
    };
  }

  private parseOldDni(raw: string) {
    const fields = raw
      .split('"')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    const dni = fields.find((f) => /^\d{7,8}$/.test(f));
    const gender = fields.find((f) => /^[MF]$/i.test(f));

    const textFields = fields.filter(
      (f) => f.length > 1 && /^[A-ZÁÉÍÓÚÜÑ' .-]+$/i.test(f)
    );

    if (!dni || !gender || textFields.length < 2) return null;

    return {
      lastName: textFields[0],
      name: textFields[1],
      gender: gender.toUpperCase(),
      dni,
    };
  }

  private calculateCuil(dni: string, gender: string): string {
    const paddedDni = dni.padStart(8, '0');
    const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let prefix = gender === 'F' ? '27' : '20';

    const getRemainder = (pref: string): number =>
      (pref + paddedDni)
        .split('')
        .reduce((sum, digit, i) => sum + Number(digit) * weights[i], 0) % 11;

    const remainder = getRemainder(prefix);
    let checkDigit: number;

    if (remainder === 0) {
      checkDigit = 0;
    } else if (remainder === 1) {
      checkDigit = prefix === '20' ? 9 : 4;
      prefix = '23';
    } else {
      checkDigit = 11 - remainder;
    }

    return `${prefix}${paddedDni}${checkDigit}`;
  }
}