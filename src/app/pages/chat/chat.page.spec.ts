import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';

import { Auth, Chat, Vibracion } from '@app/services';
import type { Mensaje } from '@app/models/mensaje.model';
import { ChatPage } from './chat.page';

function mensaje(id: string, extra: Partial<Mensaje> = {}): Mensaje {
  return {
    id,
    id_autor: 'cliente-1',
    nombre: 'Ana Pérez',
    perfil: 'cliente_registrado',
    numero_mesa: '4',
    foto: null,
    texto: `mensaje ${id}`,
    en_respuesta_a: null,
    created_at: '2026-09-21T20:41:00+00:00',
    ...extra,
  };
}

describe('ChatPage', () => {
  let page: ChatPage;
  let esMozo: boolean;
  let puedeEscribir: boolean;

  const mensajes = signal<Mensaje[]>([]);
  const chat = {
    mensajes,
    cargando: signal(false),
    esMozo: () => esMozo,
    puedeEscribir: () => puedeEscribir,
    idUsuario: () => 'cliente-1',
    validar: vi.fn(),
    iniciar: vi.fn(),
    enviar: vi.fn(),
    detener: vi.fn(),
  };
  const vibracion = { error: vi.fn(), confirmacion: vi.fn() };
  const toast = { present: vi.fn() };
  const toastController = { create: vi.fn() };
  const router = { navigate: vi.fn() };

  beforeEach(() => {
    esMozo = false;
    puedeEscribir = true;
    mensajes.set([]);

    chat.validar.mockReset().mockReturnValue(null);
    chat.iniciar.mockReset().mockResolvedValue(undefined);
    chat.enviar.mockReset().mockResolvedValue(mensaje('nuevo'));
    chat.detener.mockReset();
    vibracion.error.mockReset();
    toast.present.mockReset();
    toastController.create.mockReset().mockResolvedValue(toast);
    router.navigate.mockReset();

    TestBed.configureTestingModule({
      providers: [
        { provide: Chat, useValue: chat },
        { provide: Auth, useValue: { logout: vi.fn() } },
        { provide: Vibracion, useValue: vibracion },
        { provide: ToastController, useValue: toastController },
        { provide: Router, useValue: router },
      ],
    }).overrideComponent(ChatPage, {
      set: { template: '', imports: [], styleUrls: [] },
    });

    page = TestBed.createComponent(ChatPage).componentInstance;
  });

  it('carga la sala al abrir y la cierra al salir', () => {
    page.ngOnInit();
    expect(chat.iniciar).toHaveBeenCalled();

    page.ngOnDestroy();
    expect(chat.detener).toHaveBeenCalled();
  });

  it('avisa con un toast y vibra si no se puede cargar la sala', async () => {
    chat.iniciar.mockRejectedValue(new Error('No pudimos cargar los mensajes.'));

    page.ionViewWillEnter();
    await new Promise((resolve) => setTimeout(resolve));

    expect(vibracion.error).toHaveBeenCalled();
    expect(toastController.create).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'No pudimos cargar los mensajes.', color: 'danger' })
    );
  });

  describe('enviar', () => {
    it('con un mensaje inválido muestra el error, vibra y no envía', async () => {
      chat.validar.mockReturnValue('Escribí un mensaje antes de enviar.');

      await page.enviar();

      expect(page.error()).toBe('Escribí un mensaje antes de enviar.');
      expect(vibracion.error).toHaveBeenCalled();
      expect(chat.enviar).not.toHaveBeenCalled();
    });

    it('al enviar bien limpia el texto, el error y la respuesta elegida', async () => {
      page.texto = 'Hola';
      page.responder(mensaje('consulta-1'));

      await page.enviar();

      expect(chat.enviar).toHaveBeenCalledWith('Hola', 'consulta-1');
      expect(page.texto).toBe('');
      expect(page.error()).toBeNull();
      expect(page.respondiendoA()).toBeNull();
      expect(page.enviando()).toBe(false);
    });

    it('si falla conserva el texto, muestra el error, vibra y avisa con un toast', async () => {
      chat.enviar.mockRejectedValue(new Error('No pudimos enviar tu mensaje. Probá de nuevo.'));
      page.texto = 'Hola';

      await page.enviar();

      expect(page.texto).toBe('Hola');
      expect(page.error()).toBe('No pudimos enviar tu mensaje. Probá de nuevo.');
      expect(vibracion.error).toHaveBeenCalled();
      expect(toastController.create).toHaveBeenCalled();
      expect(page.enviando()).toBe(false);
    });

    it('no envía dos veces mientras hay un envío en curso', async () => {
      page.texto = 'Hola';

      const primero = page.enviar();
      const segundo = page.enviar();
      await Promise.all([primero, segundo]);

      expect(chat.enviar).toHaveBeenCalledTimes(1);
    });
  });

  describe('responder', () => {
    it('solo el mozo puede responder, y solo a mensajes de clientes', () => {
      const deCliente = mensaje('a');
      const deMozo = mensaje('b', { perfil: 'mozo', numero_mesa: null });

      expect(page.puedeResponder(deCliente)).toBe(false);

      esMozo = true;

      expect(page.puedeResponder(deCliente)).toBe(true);
      expect(page.puedeResponder(deMozo)).toBe(false);
    });

    it('cancelar deja de responder a esa consulta', () => {
      page.responder(mensaje('a'));
      page.cancelarRespuesta();

      expect(page.respondiendoA()).toBeNull();
    });

    it('encuentra la consulta a la que responde un mensaje', () => {
      const consulta = mensaje('a');
      const respuesta = mensaje('b', { perfil: 'mozo', en_respuesta_a: 'a' });
      mensajes.set([consulta, respuesta]);

      expect(page.citado(respuesta)).toEqual(consulta);
      expect(page.citado(consulta)).toBeNull();
    });
  });

  describe('según quién entra', () => {
    it('el cliente ve "Consulta al mozo" y vuelve al inicio', () => {
      expect(page.titulo()).toBe('Consulta al mozo');
      expect(page.rutaVolver()).toBe('/home');
    });

    it('el mozo ve "Consultas" y vuelve al panel', () => {
      esMozo = true;

      expect(page.titulo()).toBe('Consultas');
      expect(page.rutaVolver()).toBe('/admin');
    });

    it('volver navega a la ruta que corresponde según el perfil', () => {
      page.volver();
      expect(router.navigate).toHaveBeenCalledWith(['/home']);

      esMozo = true;
      page.volver();
      expect(router.navigate).toHaveBeenCalledWith(['/admin']);
    });

    it('un cliente sin mesa ve el aviso y no puede escribir', () => {
      puedeEscribir = false;

      expect(page.sinMesa()).toBe(true);
    });

    it('reconoce los mensajes propios', () => {
      expect(page.esPropio(mensaje('a'))).toBe(true);
      expect(page.esPropio(mensaje('b', { id_autor: 'otro' }))).toBe(false);
    });
  });
});
