import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss'
})
export class LoginPage {
  email = '';
  contrasena = '';
  error_login = '';
  cargando = false;

  private supabaseUrl = 'https://TU-PROYECTO.supabase.co';
  private supabaseKey = 'TU-ANON-KEY';

  constructor(private http: HttpClient, private router: Router) {}

  iniciarSesion() {
    this.error_login = '' , false;
    this.cargando = true;


    const headers = new HttpHeaders({
      apikey: this.supabaseKey,
      'Content-Type': 'application/json'
    });

    const form = {
      email: this.email,
      password: this.contrasena
    };

    this.http.post<any>(
      `${this.supabaseUrl}/auth/v1/token?grant_type=password`,
      form,
      { headers }
    ).subscribe({
      next: (respuesta) => {
        this.cargando = false;
        // respuesta trae access_token, refresh_token, user, etc.
        console.log('Login OK:', respuesta);
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.cargando = false;
        this.error_login = 'Email o contraseña incorrectos' , true;
      }
    });
  }
}
