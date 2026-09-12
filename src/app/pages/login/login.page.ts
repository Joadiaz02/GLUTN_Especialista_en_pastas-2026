import {Component,inject,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Router,RouterLink} from '@angular/router';
import { IonText, ToastController, IonItem, IonInput } from '@ionic/angular';
import {Haptics} from '@capacitor/haptics';
import { Auth } from '../../services/auth/auth';
import {IonContent,IonHeader,IonTitle,IonToolbar,IonButton,IonButtons,IonBackButton,IonSpinner,IonFooter,IonToast,} from '@ionic/angular';
@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, IonContent, IonItem, IonInput, IonButton, IonText, IonSpinner],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss'
})

export class LoginPage {
  email = '';
  contrasena = '';
  logo = 'assets/images/LOGO-GLUTN.png';
  credencialesinvalidas = signal(<boolean | null>(null));
  cargando = signal<boolean>(false);
  private toastController = inject(ToastController);

  constructor(
    private router: Router,
    private authService: Auth
  ) {}

  get formularioValido(): boolean {
    const emailValido =/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email);
    const contrasenaValida =this.contrasena.length > 0;
    return (emailValido &&contrasenaValida);
  }

  async iniciarSesion(): Promise<void> {
    if (!this.formularioValido) return;
    this.cargando.set(true);

    try {
      const usuario =
        await this.authService.iniciarsecion({email: this.email,password: this.contrasena});
      this.credencialesinvalidas.set(false);
      
      if (this.authService.esPersonal(usuario)) {
        await this.router.navigate(['/seleccion-acceso']);
        return;
      }
      await this.router.navigate(['/home']);

    }catch (error) {
      this.credencialesinvalidas.set(true);

      const toast = await this.toastController.create({
        message:'Correo o contraseña incorrectos. Verificá tus datos e intentá nuevamente.',duration: 5000,
          position: 'top',
        });
      await toast.present();
      await this.vibrarError();
      this.reproducirSonidoError();

    } finally {
      this.cargando.set(false);
    }
  }

  private async vibrarError(durationMs: number = 300): Promise<void> {
      await Haptics.vibrate({
      duration: durationMs
    });
  }
  private reproducirSonidoError(): void {
    const audio = new Audio('assets/sounds/spongebob-fail.mp3');
    audio.load();
    audio.play().catch((error) => {
      console.warn('El reproductor de audio requiere interacción previa del usuario:',error);
      });
  }
}