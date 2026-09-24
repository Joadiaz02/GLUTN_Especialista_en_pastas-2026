import {
  Component,
} from '@angular/core';

import {
  IonApp,
  IonRouterOutlet,
} from '@ionic/angular';

import {
  PedidoSheetComponent,
} from '@app/components/ui/pedido-sheet/pedido-sheet.component';


@Component({
  selector: 'app-root',

  templateUrl: 'app.component.html',

  imports: [
    IonApp,
    IonRouterOutlet,
    PedidoSheetComponent,
  ],
})
export class AppComponent {}