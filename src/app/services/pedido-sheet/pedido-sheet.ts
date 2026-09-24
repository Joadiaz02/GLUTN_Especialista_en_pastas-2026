import {
  Injectable,
  signal,
} from '@angular/core';


@Injectable({
  providedIn: 'root',
})
export class PedidoSheetService {

  abierto = signal(false);


  abrir(): void {

    this.abierto.set(true);

  }


  cerrar(): void {

    this.abierto.set(false);

  }


  alternar(): void {

    this.abierto.update(
      abierto => !abierto
    );

  }

}