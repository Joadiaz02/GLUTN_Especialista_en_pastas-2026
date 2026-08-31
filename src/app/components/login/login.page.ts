import { Component  } from '@angular/core';
import {  FormsModule, ReactiveFormsModule, } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth/auth';




@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule,FormsModule, RouterLink],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss'
})
export class LoginPage {
  email = '';
  contrasena = '';
  cargando = false;
  credencialesInvalidas = false;
  logo = 'assets/images/LOGO-GLUTN.png';
   
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
    
    const { error } = await this.authService.iniciarsesion(this.email, this.contrasena);
    
    if (error) {
      this.credencialesInvalidas = true;
      this.cargando = false;
      return;
    }

    this.router.navigate(['/home']);
  }
}
