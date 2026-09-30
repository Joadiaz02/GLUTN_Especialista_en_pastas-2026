// validators/role.validator.ts
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const EMPLOYEE_ROLES = ['metre', 'mozo', 'cocinero', 'cantinero']

export const employeeRoleValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const value = control.value;

  if (!value) return null;

  return EMPLOYEE_ROLES.includes(value) ? null : { invalidRole: true };
};