import { Component, input, output } from '@angular/core';
import { IonHeader, IonToolbar, IonButtons } from '@ionic/angular';
import { ConfirmVolverComponent } from '../confirm-volver/confirm-volver.component';
import { ConfirmDialogComponent } from '../confirm-cartel/confirm-cartel.component';

// header común con volver y cerrar sesión
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
