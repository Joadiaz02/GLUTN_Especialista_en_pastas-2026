import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonTitle,
  IonToolbar,
  IonSpinner,
  IonIcon,
  IonToast,
  ToastController,
  IonFooter,
} from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { Haptics } from '@capacitor/haptics';
import { Auth } from '@app/services';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonInput,
    IonButton,
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    IonSpinner,
    IonFooter,
  ],
})
export class LoginPage {
  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', Validators.required),
  });

  private _toastController = inject(ToastController);
  private _authService = inject(Auth);

  isLoading = signal<boolean>(false);

  get emailControl() {
    return this.form.get('email') as FormControl;
  }

  get passwordControl() {
    return this.form.get('password') as FormControl;
  }

  async login() {
    try {
      const { email, password } = this.form.getRawValue();

      this.form.markAsPending();

      this.isLoading.set(true);

      const user = await this._authService.login({
        email: email,
        password: password,
      });

      console.log(user);

      // const url = this._redirectService.redirectByRole(user.role);

      // await this._router.navigateByUrl(url);
    } catch (error) {
      const toast = await this._toastController.create({
        message:
          'Correo o contraseña incorrectos. Verificá tus datos e intentá nuevamente.',
        duration: 5000,
        position: 'top',
      });

      await toast.present();

      await this.vibrateCustom();

      this.playError();
    } finally {
      this.isLoading.set(false);
    }
  }

  async vibrateCustom(durationMs: number = 300) {
    await Haptics.vibrate({ duration: durationMs });
  }

  playError() {
    const audio = new Audio('assets/sounds/spongebob-fail.mp3');

    audio.load();
    audio.play().catch((error) => {
      console.warn(
        'El reproductor de audio requiere interacción previa del usuario:',
        error
      );
    });
  }
}
