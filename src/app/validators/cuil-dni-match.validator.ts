import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Valida que los 8 números del medio del CUIL coincidan con el DNI.
 * CUIL: XX-NNNNNNNN-X  (2 de prefijo + 8 del DNI + 1 verificador).
 * Si el DNI tiene 7 dígitos, se completa con un 0 adelante (como hace el CUIL).
 *
 * Se aplica sobre el FormGroup que tiene los controles `cuil` y `dni`.
 * Solo compara cuando ambos están completos, para no duplicar los errores
 * de "campo obligatorio" o "formato inválido".
 */
export const cuilDniMatchValidator: ValidatorFn = (
  group: AbstractControl
): ValidationErrors | null => {
  const cuil = (group.get('cuil')?.value ?? '').toString().replace(/\D/g, '');
  const dni = (group.get('dni')?.value ?? '').toString().replace(/\D/g, '');

  if (cuil.length !== 11 || dni.length < 7) return null;

  const cuilMiddle = cuil.slice(2, 10);

  return cuilMiddle === dni.padStart(8, '0')
    ? null
    : { cuilDniMismatch: true };
};