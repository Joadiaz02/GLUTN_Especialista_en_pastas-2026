import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Mock } from 'vitest';

import { EPerfilUsuario } from '../../enums';
import type { Mensaje } from '../../models/mensaje.model';
import { Auth } from '../auth/auth';
import { MesaCliente } from '../mesa-cliente/mesa-cliente';
import { SupabaseService } from '../supabase.service';
import { Chat, CHAT_LARGO_MAXIMO } from './chat';

function mensaje(id: string, minuto: number, extra: Partial<Mensaje> = {}): Mensaje {
  return {
    id,
    id_autor: 'cliente-1',
    nombre: 'Ana Pérez',
    perfil: 'cliente_registrado',
    numero_mesa: '4',
    foto: null,
    texto: `mensaje ${id}`,
    en_respuesta_a: null,
    created_at: `2026-09-21T20:${String(minuto).padStart(2, '0')}:00+00:00`,
    ...extra,
  };
}

describe('Chat', () => {
  const usuarioActual = signal<{ id: string } | null>(null);
  const numeroMesa = signal<string | null>(null);
  let perfil: string;
  let alLlegarEnVivo: (payload: { new: Mensaje }) => void;

  let seleccion: { data: Mensaje[]; error: unknown };
  let insercion: { data: Mensaje | null; error: unknown };
  let insertar: Mock<(datos: unknown) => void>;

  const canal: any = {};
  const client: any = {};

  let chat: Chat;

  beforeEach(() => {
    numeroMesa.set(null);
    perfil = EPerfilUsuario.ClienteRegistrado;
    usuarioActual.set({ id: 'cliente-1' });

    seleccion = { data: [], error: null };
    insercion = { data: null, error: null };
    insertar = vi.fn();

    canal.on = vi.fn((_tipo, _filtro, callback) => {
      alLlegarEnVivo = callback;
      return canal;
    });
    canal.subscribe = vi.fn(() => canal);

    client.channel = vi.fn(() => canal);
    client.removeChannel = vi.fn();
    client.functions = { invoke: vi.fn().mockResolvedValue({ error: null }) };
    client.from = vi.fn(() => {
      const cadena: any = {};
      cadena.select = vi.fn(() => cadena);
      cadena.order = vi.fn(() => cadena);
      cadena.limit = vi.fn(() => Promise.resolve(seleccion));
      cadena.insert = vi.fn((datos) => {
        insertar(datos);
        return cadena;
      });
      cadena.single = vi.fn(() => Promise.resolve(insercion));
      return cadena;
    });

    TestBed.configureTestingModule({
      providers: [
        { provide: SupabaseService, useValue: { client } },
        {
          provide: Auth,
          useValue: { usuarioActual, obtenerPerfil: () => perfil },
        },
        { provide: MesaCliente, useValue: { numero: numeroMesa } },
      ],
    });

    chat = TestBed.inject(Chat);
    TestBed.tick();
  });

  describe('validar', () => {
    it('rechaza un mensaje vacío o con solo espacios', () => {
      expect(chat.validar('')).toBe('Escribí un mensaje antes de enviar.');
      expect(chat.validar('   ')).toBe('Escribí un mensaje antes de enviar.');
    });

    it('rechaza un mensaje más largo que el máximo', () => {
      expect(chat.validar('a'.repeat(CHAT_LARGO_MAXIMO + 1))).toContain(String(CHAT_LARGO_MAXIMO));
    });

    it('acepta un mensaje válido', () => {
      expect(chat.validar('Hola, ¿me traen la cuenta?')).toBeNull();
      expect(chat.validar('a'.repeat(CHAT_LARGO_MAXIMO))).toBeNull();
    });
  });

  describe('cargar y tiempo real', () => {
    it('carga los mensajes ordenados del más viejo al más nuevo', async () => {
      seleccion.data = [mensaje('c', 3), mensaje('b', 2), mensaje('a', 1)];

      await chat.iniciar();

      expect(chat.mensajes().map((m) => m.id)).toEqual(['a', 'b', 'c']);
      expect(chat.cargando()).toBe(false);
    });

    it('se suscribe una sola vez aunque se inicie varias veces', async () => {
      await chat.iniciar();
      await chat.iniciar();

      expect(client.channel).toHaveBeenCalledTimes(1);
    });

    it('agrega los mensajes que llegan en vivo, sin repetirlos', async () => {
      await chat.iniciar();

      alLlegarEnVivo({ new: mensaje('a', 1) });
      alLlegarEnVivo({ new: mensaje('a', 1) });
      alLlegarEnVivo({ new: mensaje('b', 2) });

      expect(chat.mensajes().map((m) => m.id)).toEqual(['a', 'b']);
    });

    it('conserva solo los últimos 50 mensajes', async () => {
      await chat.iniciar();

      for (let i = 0; i < 60; i++) {
        alLlegarEnVivo({ new: mensaje(`m${String(i).padStart(2, '0')}`, i) });
      }

      expect(chat.mensajes()).toHaveLength(50);
      expect(chat.mensajes()[0].id).toBe('m10');
    });

    it('avisa con un mensaje en español si no puede cargar', async () => {
      seleccion.error = { message: 'fallo' };

      await expect(chat.iniciar()).rejects.toThrow('No pudimos cargar los mensajes.');
      expect(chat.cargando()).toBe(false);
    });
  });

  describe('enviar', () => {
    beforeEach(() => {
      numeroMesa.set('4');
      insercion.data = mensaje('nuevo', 5, { texto: 'Hola' });
    });

    it('guarda el mensaje con el texto recortado, la mesa y a quién responde', async () => {
      await chat.enviar('  Hola  ', 'consulta-1');

      expect(insertar).toHaveBeenCalledWith({
        texto: 'Hola',
        numero_mesa: '4',
        en_respuesta_a: 'consulta-1',
      });
    });

    it('no manda el autor, el nombre ni el perfil: los completa la base', async () => {
      await chat.enviar('Hola');

      const enviado = insertar.mock.calls[0][0];

      expect(enviado).not.toHaveProperty('id_autor');
      expect(enviado).not.toHaveProperty('nombre');
      expect(enviado).not.toHaveProperty('perfil');
    });

    it('no repite el mensaje propio cuando también llega en vivo', async () => {
      await chat.iniciar();
      await chat.enviar('Hola');

      alLlegarEnVivo({ new: insercion.data! });

      expect(chat.mensajes()).toHaveLength(1);
    });

    it('avisa a los destinatarios con la función de notificaciones', async () => {
      await chat.enviar('Hola');

      expect(client.functions.invoke).toHaveBeenCalledWith('notify-chat-message', {
        body: { id_mensaje: 'nuevo' },
      });
    });

    it('no envía nada si el mensaje está vacío', async () => {
      await expect(chat.enviar('   ')).rejects.toThrow('Escribí un mensaje antes de enviar.');

      expect(insertar).not.toHaveBeenCalled();
    });

    it('un cliente sin mesa asignada no puede escribir', async () => {
      numeroMesa.set(null);

      await expect(chat.enviar('Hola')).rejects.toThrow('Todavía no tenés una mesa asignada.');

      expect(insertar).not.toHaveBeenCalled();
    });

    it('un mozo puede escribir sin mesa', async () => {
      numeroMesa.set(null);
      perfil = EPerfilUsuario.Mozo;

      await expect(chat.enviar('En un momento vamos')).resolves.toBeDefined();
    });

    it('si no se pudo guardar, avisa en español y no manda notificaciones', async () => {
      insercion.data = null;
      insercion.error = { message: 'fallo' };

      await expect(chat.enviar('Hola')).rejects.toThrow('No pudimos enviar tu mensaje. Probá de nuevo.');

      expect(client.functions.invoke).not.toHaveBeenCalled();
    });

    it('un fallo de la notificación no rompe el envío', async () => {
      client.functions.invoke.mockRejectedValue(new Error('sin red'));
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      await expect(chat.enviar('Hola')).resolves.toBeDefined();
      expect(chat.mensajes()).toHaveLength(1);
    });
  });

  describe('cambio de usuario', () => {
    it('vacía la sala y cierra el canal cuando cambia el usuario', async () => {
      seleccion.data = [mensaje('a', 1)];
      await chat.iniciar();
      expect(chat.mensajes()).toHaveLength(1);

      usuarioActual.set(null);
      TestBed.tick();

      expect(chat.mensajes()).toEqual([]);
      expect(client.removeChannel).toHaveBeenCalled();
    });

    it('no vacía la sala cuando Supabase refresca el token del mismo usuario', async () => {
      seleccion.data = [mensaje('a', 1)];
      await chat.iniciar();

      usuarioActual.set({ id: 'cliente-1' });
      TestBed.tick();

      expect(chat.mensajes()).toHaveLength(1);
    });
  });
});
