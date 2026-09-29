import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// texto obligatorio sin solo espacios y con largo mínimo y máximo
export function textoValido(minimo: number, maximo: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value;

    // el vacío lo informa required
    if (valor === null || valor === undefined || valor === '') {
      return null;
    }

    const texto = String(valor).trim();

    if (texto.length === 0) {
      return { soloEspacios: true };
    }

    if (texto.length < minimo) {
      return { largoMinimo: { minimo } };
    }

    if (texto.length > maximo) {
      return { largoMaximo: { maximo } };
    }

    return null;
  };
}
