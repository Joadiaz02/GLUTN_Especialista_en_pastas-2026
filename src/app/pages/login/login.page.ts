import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
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
} from '@ionic/angular';
import { RouterLink } from '@angular/router';

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
    IonIcon,
  ],
})
export class LoginPage {
  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', Validators.required),
  });

  private _toastController = inject(ToastController);

  async presentToast() {
    const toast = await this._toastController.create({
      message: 'No pudimos completar la acción. Intentá nuevamente más tarde.',
      duration: 5000,
      position: 'top',
    });

    await toast.present();
  }
}
