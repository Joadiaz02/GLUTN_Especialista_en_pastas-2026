import { Directive, HostListener, inject } from '@angular/core';
import { FormGroupDirective } from '@angular/forms';
import { Vibracion } from '@app/services/vibracion';

// Va en un <form [formGroup]>: cuando el usuario sale de un campo y ese
// campo quedó inválido (se muestra su mensaje de error), el celular vibra.
@Directive({
  selector: 'form[appVibrarErrores]',
})
export class VibrarErrores {
  private formGroup = inject(FormGroupDirective);
  private vibracion = inject(Vibracion);

  @HostListener('ionBlur', ['$event'])
  alSalirDeUnCampo(evento: Event): void {
    const nombre = (evento.target as HTMLElement | null)?.getAttribute('formcontrolname');
    if (!nombre) return;

    // Se espera un ciclo para que Angular marque el campo como "touched".
    setTimeout(() => {
      if (this.formGroup.form.get(nombre)?.invalid) {
        void this.vibracion.errorValidacion();
      }
    });
  }
}
