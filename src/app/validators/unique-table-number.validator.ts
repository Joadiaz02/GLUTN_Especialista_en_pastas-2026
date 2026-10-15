import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function uniqueTableNumberValidator(
  getTakenNumbers: () => ReadonlySet<number>,
  // In the edit screen, pass the table's own number so it doesn't collide with itself.
  getOwnNumber: () => number | null = () => null
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;

    // Let Validators.required handle the empty case.
    if (raw === null || raw === undefined || raw === '') return null;

    const value = Number(raw);

    if (!Number.isInteger(value) || value < 1) {
      return { invalidNumber: true };
    }

    if (value === getOwnNumber()) return null;

    return getTakenNumbers().has(value) ? { numberTaken: true } : null;
  };
}