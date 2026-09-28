import { FormControl } from '@angular/forms';

import { textoValido } from './texto';

describe('textoValido', () => {
  const validar = (valor: string) => textoValido(3, 10)(new FormControl(valor));

  it('deja el vacío para Validators.required', () => {
    expect(validar('')).toBeNull();
  });

  it('un texto de solo espacios cuenta como vacío', () => {
    expect(validar('    ')).toEqual({ soloEspacios: true });
  });

  it('mide el largo sin los espacios de los costados', () => {
    expect(validar('  ab  ')).toEqual({ largoMinimo: { minimo: 3 } });
    expect(validar('  Ñoquis  ')).toBeNull();
  });

  it('rechaza un texto más largo que el máximo', () => {
    expect(validar('Sorrentinos de calabaza')).toEqual({ largoMaximo: { maximo: 10 } });
  });
});
