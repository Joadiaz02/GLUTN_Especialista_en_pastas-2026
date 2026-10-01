import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Auth } from '../auth/auth';
import { SupabaseService } from '../supabase.service';
import { EPerfilUsuario } from '../../enums';
import { Juegos } from './juegos';

describe('Juegos', () => {
  const usuarioActual = signal<{ id: string } | null>(null);
  let service: Juegos;
  let rpc: ReturnType<typeof vi.fn>;
  let descuentoGuardado: number | null;

  // espera a que terminen las llamadas a la base
  const esperarBase = () => new Promise((resolve) => setTimeout(resolve, 0));

  beforeEach(() => {
    usuarioActual.set({ id: 'usuario-a' });
    descuentoGuardado = null;
    rpc = vi.fn((nombre: string) =>
      Promise.resolve({
        data: nombre === 'juego_descuento_actual' ? descuentoGuardado : null,
        error: null,
      })
    );

    TestBed.configureTestingModule({
      providers: [
        { provide: SupabaseService, useValue: { client: { rpc } } },
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

  describe('guardado en la base', () => {
    it('al entrar trae el descuento de la estadía aunque se haya jugado en otra sesión', async () => {
      descuentoGuardado = 20;

      await service.cargar();

      expect(service.descuentoActual()).toBe(20);
      expect(service.puedeJugarPorPrimeraVez()).toBe(false);
    });

    it('si en la base no hay intento, se puede jugar por el descuento', async () => {
      await service.cargar();

      expect(service.puedeJugarPorPrimeraVez()).toBe(true);
    });

    it('anota el primer intento al empezar la partida y lo termina con el resultado', async () => {
      service.iniciarIntento('ruleta');
      expect(service.puedeJugarPorPrimeraVez()).toBe(true);

      service.registrarIntento(true, 20);
      await esperarBase();

      const llamadas = rpc.mock.calls.map(([nombre]) => nombre);
      expect(llamadas).toContain('juego_iniciar');
      expect(llamadas.indexOf('juego_iniciar')).toBeLessThan(llamadas.indexOf('juego_terminar'));
      expect(rpc).toHaveBeenCalledWith('juego_iniciar', { p_juego: 'ruleta' });
      expect(rpc).toHaveBeenCalledWith('juego_terminar', { p_gano: true });
    });

    it('un resultado neutro anula el intento y la próxima partida vuelve a ser por el descuento', async () => {
      service.iniciarIntento('ta-te-ti');
      service.anularIntento();
      await esperarBase();

      expect(rpc).toHaveBeenCalledWith('juego_anular');
      expect(service.puedeJugarPorPrimeraVez()).toBe(true);
    });

    it('las partidas por diversión no se anotan en la base', async () => {
      service.registrarIntento(false, 20);
      await esperarBase();
      rpc.mockClear();

      service.iniciarIntento('sopa-de-letras');
      service.registrarIntento(true, 10);
      await esperarBase();

      expect(rpc).not.toHaveBeenCalled();
      expect(service.descuentoActual()).toBe(0);
    });

    it('si la base falla, el juego sigue y el intento queda en memoria', async () => {
      rpc.mockRejectedValue(new Error('sin conexión'));

      service.iniciarIntento('ruleta');
      service.registrarIntento(true, 20);
      await esperarBase();

      expect(service.descuentoActual()).toBe(20);
    });
  });
});
