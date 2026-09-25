import { TestBed } from '@angular/core/testing';
import { ToastController } from '@ionic/angular';

import { Vibracion } from '../vibracion';
import { EscanerQr } from './escaner-qr';

describe('EscanerQr', () => {
  let escaner: EscanerQr;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ToastController, useValue: {} },
        { provide: Vibracion, useValue: {} },
      ],
    });

    escaner = TestBed.inject(EscanerQr);
  });

  it('reconoce el QR de ingreso al local', () => {
    expect(escaner.interpretar('{"tipo":"ingreso"}')).toEqual({ tipo: 'ingreso' });
  });

  it('reconoce el QR de mesa con su id', () => {
    expect(escaner.interpretar('{"tipo":"mesa","id":"abc-123"}')).toEqual({
      tipo: 'mesa',
      id: 'abc-123',
    });
  });

  it('reconoce los cinco QR de propina', () => {
    for (const porcentaje of [0, 5, 10, 15, 20]) {
      expect(escaner.interpretar(JSON.stringify({ tipo: 'propina', porcentaje }))).toEqual({
        tipo: 'propina',
        porcentaje,
      });
    }
  });

  it('rechaza una propina con un porcentaje que no existe', () => {
    expect(escaner.interpretar('{"tipo":"propina","porcentaje":30}')).toBeNull();
  });

  it('rechaza un QR de mesa sin id', () => {
    expect(escaner.interpretar('{"tipo":"mesa"}')).toBeNull();
    expect(escaner.interpretar('{"tipo":"mesa","id":""}')).toBeNull();
  });

  it('rechaza códigos que no son de la app', () => {
    expect(escaner.interpretar('https://www.google.com')).toBeNull();
    expect(escaner.interpretar('{"tipo":"otro"}')).toBeNull();
    expect(escaner.interpretar('null')).toBeNull();
    expect(escaner.interpretar('')).toBeNull();
  });
});
