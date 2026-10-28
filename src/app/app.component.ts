import {
  Component,
  inject,
} from '@angular/core';

import {
  IonApp,
  IonRouterOutlet,
} from '@ionic/angular';

import {
  PedidoSheetComponent,
} from '@app/components/ui/pedido-sheet/pedido-sheet.component';

import {
  IngresoSocial,
} from '@app/services/auth/ingreso-social';


@Component({
  selector: 'app-root',

  templateUrl: 'app.component.html',

  imports: [
    IonApp,
    IonRouterOutlet,
    PedidoSheetComponent,
  ],
})
export class AppComponent {
  constructor() {
    // la vuelta del login con Google o Discord puede llegar en cualquier pantalla
    inject(IngresoSocial).escucharRetorno();
  }
}
