import { Component, computed, effect, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import {
  IonButton,
  IonContent,
  IonFooter,
  ToastController,
} from '@ionic/angular';
import { Router } from '@angular/router';

import { Auth, Chat, CHAT_LARGO_MAXIMO, Vibracion } from '@app/services';
import type { Mensaje } from '@app/models/mensaje.model';
import { SpinnerLogoComponent } from '@app/components/ui/spinner-logo/spinner-logo.component';
import { GtnAvatar } from '@app/components';
import { HeaderComponent } from '@app/components/ui/header/header.component';

const LARGO_CITA = 60;

@Component({
  selector: 'app-chat',
  standalone: true,
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  imports: [
    HeaderComponent,
    FormsModule,
    DatePipe,
    IonButton,
    IonContent,
    IonFooter,
    SpinnerLogoComponent,
    GtnAvatar,
  ],
})
export class ChatPage implements OnInit, OnDestroy {
  chat = inject(Chat);

  private _auth = inject(Auth);
  private _vibracion = inject(Vibracion);
  private _toastController = inject(ToastController);
  private _router = inject(Router);

  private _contenido = viewChild(IonContent);

  readonly largoMaximo = CHAT_LARGO_MAXIMO;

  texto = '';
  enviando = signal(false);
  error = signal<string | null>(null);
  respondiendoA = signal<Mensaje | null>(null);

  private _porId = computed(
    () => new Map(this.chat.mensajes().map((mensaje) => [mensaje.id, mensaje]))
  );

  constructor() {
    // Cada mensaje nuevo (propio o ajeno) deja la sala al final.
    effect(() => {
      this.chat.mensajes();
      setTimeout(() => void this._contenido()?.scrollToBottom(200), 0);
    });
  }

  ngOnInit(): void {
    // TEMPORAL: hasta que exista la asignación de mesas (punto 10), para
    // poder probar el chat como cliente. Sacar cuando ese punto esté listo.
    if (!localStorage.getItem('mesa')) {
      localStorage.setItem('mesa', '4');
    }

    void this.iniciar();
  }

  // Ionic mantiene las páginas en pila: al volver se recarga la sala.
  ionViewWillEnter(): void {
    void this.iniciar();
  }

  ngOnDestroy(): void {
    this.chat.detener();
  }

  titulo(): string {
    return this.chat.esMozo() ? 'Consultas' : 'Consulta al mozo';
  }

  rutaVolver(): string {
    return this.chat.esMozo() ? '/admin' : '/home';
  }

  volver(): void {
    void this._router.navigate([this.rutaVolver()]);
  }

  sinMesa(): boolean {
    return !this.chat.puedeEscribir();
  }

  esPropio(mensaje: Mensaje): boolean {
    return mensaje.id_autor === this.chat.idUsuario();
  }

  esDeMozo(mensaje: Mensaje): boolean {
    return mensaje.perfil === 'mozo';
  }

  avatarUrl(mensaje: Mensaje): string | null {
    return this.chat.avatarUrl(mensaje.foto);
  }

  // Fallback cuando no hay foto: las iniciales del nombre, hasta 2 letras.
  iniciales(nombre: string): string {
    const letras = nombre
      .trim()
      .split(/\s+/)
      .map((palabra) => palabra[0])
      .filter(Boolean);

    return (letras[0] ?? '') + (letras[1] ?? '');
  }

  // Solo el mozo responde, y solo consultas de clientes.
  puedeResponder(mensaje: Mensaje): boolean {
    return this.chat.esMozo() && !this.esDeMozo(mensaje);
  }

  citado(mensaje: Mensaje): Mensaje | null {
    return mensaje.en_respuesta_a
      ? this._porId().get(mensaje.en_respuesta_a) ?? null
      : null;
  }

  resumen(texto: string): string {
    return texto.length > LARGO_CITA ? `${texto.slice(0, LARGO_CITA)}…` : texto;
  }

  responder(mensaje: Mensaje): void {
    this.respondiendoA.set(mensaje);
  }

  cancelarRespuesta(): void {
    this.respondiendoA.set(null);
  }

  alEscribir(): void {
    this.error.set(null);
  }

  async enviar(): Promise<void> {
    if (this.enviando()) return;

    const errorTexto = this.chat.validar(this.texto);

    if (errorTexto) {
      this.error.set(errorTexto);
      void this._vibracion.error();
      return;
    }

    this.enviando.set(true);

    try {
      await this.chat.enviar(this.texto, this.respondiendoA()?.id ?? null);

      this.texto = '';
      this.error.set(null);
      this.respondiendoA.set(null);
    } catch (error) {
      const mensaje =
        error instanceof Error ? error.message : 'No pudimos enviar tu mensaje. Probá de nuevo.';

      this.error.set(mensaje);
      void this._vibracion.error();
      await this.avisar(mensaje);
    } finally {
      this.enviando.set(false);
    }
  }

  async cerrarSesion(): Promise<void> {
    await this._auth.logout();

    localStorage.removeItem('mesa');

    void this._router.navigate(['/login']);
  }

  private async iniciar(): Promise<void> {
    try {
      await this.chat.iniciar();
    } catch (error) {
      void this._vibracion.error();
      await this.avisar(
        error instanceof Error ? error.message : 'No pudimos cargar los mensajes.'
      );
    }
  }

  private async avisar(mensaje: string): Promise<void> {
    const toast = await this._toastController.create({
      message: mensaje,
      duration: 3000,
      position: 'top',
      color: 'danger',
    });

    await toast.present();
  }
}
