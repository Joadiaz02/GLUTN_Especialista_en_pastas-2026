import { AbstractControl, ValidationErrors } from '@angular/forms';

const CUIL_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

export function cuilValidator(
  control: AbstractControl<string>
): ValidationErrors | null {
  const digitsOnly = (control.value ?? '').toString().replace(/\D/g, '');
  if (digitsOnly.length !== 11) return { cuil: true };

  console.log(digitsOnly)

  const digits = digitsOnly.split('').map(Number);
  const sum = CUIL_WEIGHTS.reduce((acc, w, i) => acc + w * digits[i], 0);

  let checkDigit = 11 - (sum % 11);
  if (checkDigit === 11) checkDigit = 0;

  return checkDigit === digits[10] ? null : { cuil: true };
}