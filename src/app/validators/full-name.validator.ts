// validators/full-name.validator.ts
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function fullNameValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim().replace(/\s+/g, ' ');

    // Empty values are handled by Validators.required
    if (!value) {
      return null;
    }

    // Letters (including accents and ñ), apostrophes and hyphens only
    const wordPattern = /^\p{L}[\p{L}'’-]*$/u;
    const words = value.split(' ');

    if (words.some((word) => !wordPattern.test(word))) {
      return { invalidCharacters: true };
    }

    if (words.length < 2) {
      return { missingLastName: true };
    }

    if (words.some((word) => word.length < 2)) {
      return { wordTooShort: true };
    }

    return null;
  };
}