import { Component, input, output } from '@angular/core';
import { IonHeader, IonToolbar, IonButtons } from '@ionic/angular';
import { ConfirmVolverComponent } from '../confirm-volver/confirm-volver.component';
import { ConfirmDialogComponent } from '../confirm-cartel/confirm-cartel.component';

// Header común: botón "volver" (con confirmación) a la izquierda y
// "cerrar sesión" (con confirmación) a la derecha. El título de la
// pantalla no va acá: va debajo del logo, con la clase .titulo-pagina.
//
// Si la pantalla necesita otra cosa a la derecha (ej. "Ingresar" cuando
// no hay sesión), se pasa con el atributo headerFin y se oculta el
// cerrar sesión con [mostrarCerrarSesion]="false".
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    ConfirmVolverComponent,
    ConfirmDialogComponent,
  ],
})
export class HeaderComponent {
  mostrarVolver = input(true);
  tituloVolver = input('¿Quieres volver?');
  mensajeVolver = input('');
  textoConfirmarVolver = input('Confirmar');
  colorConfirmarVolver = input<'danger' | 'primary'>('danger');

  mostrarCerrarSesion = input(true);

  volver = output<void>();
  cerrarSesion = output<void>();
}
