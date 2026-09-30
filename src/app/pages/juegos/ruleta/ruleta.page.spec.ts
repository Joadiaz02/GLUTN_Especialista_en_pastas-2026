import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { Auth, Juegos, Vibracion } from '@app/services';
import { EPerfilUsuario } from '../../../enums';
import { RuletaPage } from './ruleta.page';
import { SupabaseService } from '../../../services/supabase.service';

describe('RuletaPage - salir en medio de una partida', () => {
  let page: RuletaPage;
  let juegos: Juegos;

  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

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
        { provide: Vibracion, useValue: { error: vi.fn(), confirmacion: vi.fn() } },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    }).overrideComponent(RuletaPage, {
      set: { template: '', imports: [], styleUrls: [] },
    });

    juegos = TestBed.inject(Juegos);
    page = TestBed.createComponent(RuletaPage).componentInstance;
    TestBed.tick();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('con la ruleta quieta se puede salir sin gastar el intento', () => {
    page.ionViewWillLeave();

    expect(juegos.puedeJugarPorPrimeraVez()).toBe(true);
  });

  it('salir con la ruleta girando cuenta como perder y la deja quieta', () => {
    page.onBotonClick();
    expect(page.estado()).toBe('girando');

    page.ionViewWillLeave();

    expect(juegos.descuentoActual()).toBe(0);
    expect(page.estado()).toBe('quieta');
  });

  it('salir mientras frena también cuenta como perder', () => {
    page.onBotonClick();
    page.onBotonClick();
    expect(page.estado()).toBe('frenando');

    page.ionViewWillLeave();

    expect(juegos.descuentoActual()).toBe(0);
    expect(page.estado()).toBe('quieta');
  });

  it('si el descuento ya se gastó, salir no lo cambia y solo reinicia', () => {
    juegos.registrarIntento(true, 20);

    page.onBotonClick();
    page.ionViewWillLeave();

    expect(juegos.descuentoActual()).toBe(20);
    expect(page.estado()).toBe('quieta');
  });

  it('salir después de ver el resultado no cambia nada', () => {
    juegos.registrarIntento(true, 20);
    page.estado.set('resultado');

    page.ionViewWillLeave();

    expect(page.estado()).toBe('resultado');
    expect(juegos.descuentoActual()).toBe(20);
  });

  it('salir dos veces seguidas no vuelve a registrar nada', () => {
    page.onBotonClick();
    page.ionViewWillLeave();
    page.ngOnDestroy();

    expect(juegos.descuentoActual()).toBe(0);
  });

  it('el cartel de salida avisa que se pierde el descuento solo si está girando', () => {
    expect(page.mensajeVolver()).toBe('Vas a salir del juego de la ruleta.');

    page.onBotonClick();

    expect(page.mensajeVolver()).toContain('te quedás sin descuento');
  });
});
