import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Auth } from '../auth/auth';
import { EPerfilUsuario } from '../../enums';
import { Juegos } from '../juegos/juegos';
import { SopaLetras } from './sopa-letras';
import { SupabaseService } from '../supabase.service';

describe('SopaLetras', () => {
  let sopa: SopaLetras;
  let juegos: Juegos;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SupabaseService,
          useValue: { client: { rpc: vi.fn().mockResolvedValue({ data: null, error: null }) } },
        },
        {
          provide: Auth,
          useValue: {
            usuarioActual: signal({ id: 'usuario-a' }),
            obtenerPerfil: () => EPerfilUsuario.ClienteRegistrado,
          },
        },
      ],
    });

    juegos = TestBed.inject(Juegos);
    sopa = TestBed.inject(SopaLetras);
    TestBed.tick();
  });

  afterEach(() => sopa.prepararPartida());

  it('no muestra sopa ni palabras hasta que se aprieta Comenzar', () => {
    expect(sopa.iniciada()).toBe(false);
    expect(sopa.grilla()).toEqual([]);
    expect(sopa.palabras()).toEqual([]);

    sopa.iniciarPartida();

    expect(sopa.iniciada()).toBe(true);
    expect(sopa.grilla().length).toBeGreaterThan(0);
    expect(sopa.palabras().length).toBeGreaterThan(0);
  });

  it('salir en medio de la primera partida cuenta como perder', () => {
    sopa.iniciarPartida();
    sopa.abandonarPartida();

    expect(juegos.descuentoActual()).toBe(0);
    expect(juegos.puedeJugarPorPrimeraVez()).toBe(false);
  });

  it('salir reinicia la sopa entera', () => {
    sopa.iniciarPartida();
    sopa.abandonarPartida();

    expect(sopa.iniciada()).toBe(false);
    expect(sopa.grilla()).toEqual([]);
    expect(sopa.palabras()).toEqual([]);
    expect(sopa.encontradas()).toEqual([]);
    expect(sopa.tiempoRestante()).toBe(30);
  });

  it('si el descuento ya se gastó, salir no lo cambia y solo reinicia', () => {
    juegos.registrarIntento(true, 20);

    sopa.iniciarPartida();
    sopa.abandonarPartida();

    expect(juegos.descuentoActual()).toBe(20);
    expect(sopa.iniciada()).toBe(false);
  });

  it('salir sin haber comenzado no gasta el intento', () => {
    sopa.abandonarPartida();

    expect(juegos.puedeJugarPorPrimeraVez()).toBe(true);
  });

  it('salir después de terminar la partida no cambia el resultado', () => {
    sopa.iniciarPartida();
    sopa.finalizarPartida();
    sopa.abandonarPartida();

    expect(juegos.descuentoActual()).toBe(10);
    expect(sopa.juegoTerminado()).toBe(true);
  });

  it('abandonar dos veces seguidas no vuelve a registrar nada', () => {
    sopa.iniciarPartida();
    sopa.abandonarPartida();
    sopa.abandonarPartida();

    expect(juegos.descuentoActual()).toBe(0);
  });
});
