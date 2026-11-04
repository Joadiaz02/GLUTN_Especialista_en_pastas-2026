import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { Auth, Juegos, Vibracion } from '@app/services';
import { EPerfilUsuario } from '../../../enums';
import { TaTeTiPage } from './ta-te-ti.page';
import { SupabaseService } from '../../../services/supabase.service';

describe('TaTeTiPage - salir en medio de una partida', () => {
  let page: TaTeTiPage;
  let juegos: Juegos;

  beforeEach(() => {
    vi.useFakeTimers();

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
        { provide: Vibracion, useValue: { error: vi.fn() } },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    }).overrideComponent(TaTeTiPage, {
      set: { template: '', imports: [], styleUrls: [] },
    });

    juegos = TestBed.inject(Juegos);
    page = TestBed.createComponent(TaTeTiPage).componentInstance;
    TestBed.tick();
  });

  afterEach(() => vi.useRealTimers());

  it('con el tablero vacío se puede salir sin gastar el intento', () => {
    page.ionViewWillLeave();

    expect(juegos.puedeJugarPorPrimeraVez()).toBe(true);
  });

  it('salir con una partida en curso cuenta como perder', () => {
    page.jugar(0);
    page.ionViewWillLeave();

    expect(juegos.descuentoActual()).toBe(0);
  });

  it('salir reinicia el tablero y frena el turno de la PC', () => {
    page.jugar(0);
    page.ionViewWillLeave();
    vi.advanceTimersByTime(2000);

    expect(page.celdas().every((c) => c === null)).toBe(true);
    expect(page.turnoPc()).toBe(false);
  });

  it('si el descuento ya se gastó, salir no lo cambia y solo reinicia', () => {
    juegos.registrarIntento(true, 15);

    page.jugar(0);
    page.ionViewWillLeave();

    expect(juegos.descuentoActual()).toBe(15);
    expect(page.celdas().every((c) => c === null)).toBe(true);
  });

  it('salir dos veces seguidas no vuelve a registrar nada', () => {
    page.jugar(0);
    page.ionViewWillLeave();
    page.ngOnDestroy();

    expect(juegos.descuentoActual()).toBe(0);
  });

  it('el cartel de salida avisa que se pierde el descuento solo si hay partida en curso', () => {
    expect(page.mensajeVolver()).toBe('Vas a salir del juego de ta-te-ti.');

    page.jugar(0);

    expect(page.mensajeVolver()).toContain('te quedás sin descuento');
  });
});
