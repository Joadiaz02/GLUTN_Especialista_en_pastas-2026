import {
  ErrorHandler,
  Injectable,
  inject,
} from '@angular/core';

import { Vibracion } from './vibracion/vibracion';

@Injectable()
export class GlobalErrorHandler
  implements ErrorHandler {

  private readonly vibracion =
    inject(Vibracion);

  handleError(
    error: unknown
  ): void {
    void this.vibracion.error();

    console.error(
      'Error no controlado en GLUTN:',
      error
    );
  }
}