import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { IonContent, IonButton } from '@ionic/angular';

@Component({
  selector: 'app-chat',
  standalone: true,
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  imports: [
    CommonModule,   
    FormsModule,    
    DatePipe,       
    IonContent,
    IonButton
  ],
})
export class ChatPage {

  usuarioId = 'user-123'; // el logueado
  usuarioNombre = 'Mariano';
  usuarioAvatar = 'assets/images/avatar-user.png';

  nuevoMensaje = '';

  mensajes: {
    autorId: string;
    autor: string;
    avatar: string;
    texto: string;
    fecha: Date;
  }[] = [];

  enviarMensaje() {
    if (!this.nuevoMensaje.trim()) return;

    const mensaje = {
      autorId: this.usuarioId,
      autor: this.usuarioNombre,
      avatar: this.usuarioAvatar,
      texto: this.nuevoMensaje,
      fecha: new Date()
    };

    this.mensajes.push(mensaje);

    // Limitar a 20 mensajes
    if (this.mensajes.length > 20) {
      this.mensajes.shift();
    }

    this.nuevoMensaje = '';
  }
}
