import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Texto obligatorio que se mide sin los espacios de los costados:
// "   " cuenta como vacío (Validators.required lo deja pasar).
// Errores: 'soloEspacios', 'largoMinimo' y 'largoMaximo' (con el límite).
export function textoValido(minimo: number, maximo: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value;

    // El vacío lo informa Validators.required.
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
