import { Directive, HostListener, inject } from '@angular/core';
import { FormGroupDirective } from '@angular/forms';
import { Vibracion } from '@app/services/vibracion';

// vibra cuando un campo del formulario queda inválido
@Directive({
  selector: 'form[appVibrarErrores], [formGroup][appVibrarErrores]',
})
export class VibrarErrores {
  private formGroup = inject(FormGroupDirective);
  private vibracion = inject(Vibracion);

  @HostListener('ionBlur', ['$event'])
  alSalirDeUnCampo(evento: Event): void {
    const nombre = (evento.target as HTMLElement | null)?.getAttribute('formcontrolname');
    if (!nombre) return;

    // espera a que angular marque el campo como tocado
    setTimeout(() => {
      if (this.formGroup.form.get(nombre)?.invalid) {
        void this.vibracion.errorValidacion();
      }
    });
  }
}