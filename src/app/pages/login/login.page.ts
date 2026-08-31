import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Haptics } from '@capacitor/haptics';
import { Auth } from '../../services/auth/auth'; 

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss'
})
export class LoginPage {
  email = '';
  contrasena = '';
  cargando = false;
  credencialesInvalidas = false;
  logo = 'assets/images/LOGO-GLUTN.png';

  private toastController = inject(ToastController);

  constructor(
    private router: Router,
    private authService: Auth,
  ) {}

  get formularioValido(): boolean {
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email);
    const contrasenaValida = this.contrasena.length > 0;
    return emailValido && contrasenaValida;
  }

  async iniciarSesion(): Promise<void> {
    if (!this.formularioValido) return;

    this.credencialesInvalidas = false;
    this.cargando = true;

    try {
      await this.authService.iniciarsecion({
        email: this.email,
        password: this.contrasena
      });

      this.router.navigate(['/home']);

    } catch (error) {
      this.credencialesInvalidas = true;

      const toast = await this.toastController.create({
        message: 'Correo o contraseña incorrectos. Verificá tus datos e intentá nuevamente.',
        duration: 5000,
        position: 'top',
      });
      await toast.present();

      await this.vibrarError();
      this.reproducirSonidoError();

    } finally {
      this.cargando = false;
    }
  }

  private async vibrarError(durationMs: number = 300) {
    await Haptics.vibrate({ duration: durationMs });
  }

  private reproducirSonidoError() {
    const audio = new Audio('assets/sounds/spongebob-fail.mp3');
    audio.load();
    audio.play().catch((error) => {
      console.warn('El reproductor de audio requiere interacción previa del usuario:', error);
    });
  }
}