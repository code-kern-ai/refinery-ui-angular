import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function MatchProjectNameValidator(name: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    return !(name === control.value)
      ? { matchName: { value: control.value } }
      : null;
  };
}
