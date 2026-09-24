import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Auth } from '../auth/auth';
import { EPerfilUsuario } from '../../enums';
import { Juegos } from './juegos';

describe('Juegos', () => {
  const usuarioActual = signal<{ id: string } | null>(null);
  let service: Juegos;

  beforeEach(() => {
    usuarioActual.set({ id: 'usuario-a' });

    TestBed.configureTestingModule({
      providers: [
        {
          provide: Auth,
          useValue: {
            usuarioActual,
            obtenerPerfil: () => EPerfilUsuario.ClienteRegistrado,
          },
        },
      ],
    });

    service = TestBed.inject(Juegos);
    TestBed.tick();
  });

  it('un cliente registrado se queda con el descuento del primer intento', () => {
    service.registrarIntento(true, 20);

    expect(service.descuentoActual()).toBe(20);
    expect(service.puedeJugarPorPrimeraVez()).toBe(false);
  });

  it('solo cuenta el primer intento', () => {
    service.registrarIntento(false, 20);
    service.registrarIntento(true, 15);

    expect(service.descuentoActual()).toBe(0);
  });

  it('reinicia el intento al cerrar sesión', () => {
    service.registrarIntento(true, 20);

    usuarioActual.set(null);
    TestBed.tick();

    expect(service.descuentoActual()).toBeNull();
    expect(service.puedeJugarPorPrimeraVez()).toBe(true);
  });

  it('reinicia el intento cuando entra otra persona', () => {
    service.registrarIntento(true, 20);

    usuarioActual.set({ id: 'usuario-b' });
    TestBed.tick();

    expect(service.puedeJugarPorPrimeraVez()).toBe(true);
  });

  it('no reinicia el intento cuando Supabase refresca el token del mismo usuario', () => {
    service.registrarIntento(true, 20);

    usuarioActual.set({ id: 'usuario-a' });
    TestBed.tick();

    expect(service.descuentoActual()).toBe(20);
  });

  it('ignora un intento que llega sin usuario logueado (ej. después de cerrar sesión)', () => {
    usuarioActual.set(null);
    TestBed.tick();

    service.registrarIntento(false, 20);

    expect(service.descuentoActual()).toBeNull();
  });

  it('el aviso de abandono avisa que se pierde el descuento solo en el primer intento', () => {
    expect(service.avisoAbandono()).toContain('te quedás sin descuento');

    service.registrarIntento(false, 20);

    expect(service.avisoAbandono()).not.toContain('sin descuento');
    expect(service.avisoAbandono()).toContain('se reinicia');
  });
});
