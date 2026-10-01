import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { EPerfilUsuario } from '../../enums';
import type { Mensaje } from '../../models/mensaje.model';
import { Auth } from '../auth/auth';
import { MesaCliente } from '../mesa-cliente/mesa-cliente';
import { SupabaseService } from '../supabase.service';

export const CHAT_LARGO_MAXIMO = 500;

const CHAT_LIMITE_MENSAJES = 50;

// sala de consultas entre mozos y clientes en vivo
@Injectable({ providedIn: 'root' })
export class Chat {
  private _db = inject(SupabaseService);
  private _auth = inject(Auth);
  private _mesaCliente = inject(MesaCliente);

  private _canal?: RealtimeChannel;

  mensajes = signal<Mensaje[]>([]);
  cargando = signal(false);

  // compara por id para no cortar la sala al refrescar la sesión
  private _idUsuario = computed<string | null>(
    () => this._auth.usuarioActual()?.id ?? null
  );

  constructor() {
    // corta la sala si cambia el usuario
    effect(() => {
      this._idUsuario();
      untracked(() => this.detener());
    });
  }

  idUsuario(): string | null {
    return this._idUsuario();
  }

  esMozo(): boolean {
    return this._auth.obtenerPerfil() === EPerfilUsuario.Mozo;
  }

  // arma la dirección del avatar
  avatarUrl(foto: string | null): string | null {
    if (!foto) {
      return null;
    }

    if (foto.startsWith('http://') || foto.startsWith('https://')) {
      return foto;
    }

    return this._db.getAvatarUrl(foto).data.publicUrl;
  }

  // mesa asignada por el metre
  numeroMesa(): string | null {
    return this._mesaCliente.numero();
  }

  // el mozo siempre escribe, el cliente solo con mesa
  puedeEscribir(): boolean {
    return this.esMozo() || this.numeroMesa() !== null;
  }

  // devuelve el error del texto o null si es válido
  validar(texto: string): string | null {
    const limpio = texto.trim();

    if (!limpio) {
      return 'Escribí un mensaje antes de enviar.';
    }

    if (limpio.length > CHAT_LARGO_MAXIMO) {
      return `El mensaje no puede superar los ${CHAT_LARGO_MAXIMO} caracteres.`;
    }

    return null;
  }

  // si el canal ya existe solo recarga
  async iniciar(): Promise<void> {
    if (!this._canal) {
      this.suscribir();
    }

    await this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);

    try {
      const { data, error } = await this._db.client
        .from('mensajes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(CHAT_LIMITE_MENSAJES);

      if (error) {
        throw new Error('No pudimos cargar los mensajes.');
      }

      const recibidos = (data ?? []) as Mensaje[];

      // no pierde lo que llegó mientras cargaba
      this.mensajes.update((actuales) =>
        this.ordenar([...recibidos, ...actuales])
      );
    } finally {
      this.cargando.set(false);
    }
  }

  async enviar(texto: string, enRespuestaA: string | null = null): Promise<Mensaje> {
    const errorTexto = this.validar(texto);

    if (errorTexto) {
      throw new Error(errorTexto);
    }

    if (!this.puedeEscribir()) {
      throw new Error('Todavía no tenés una mesa asignada.');
    }

    const { data, error } = await this._db.client
      .from('mensajes')
      .insert({
        texto: texto.trim(),
        numero_mesa: this.numeroMesa(),
        en_respuesta_a: enRespuestaA,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error('No pudimos enviar tu mensaje. Probá de nuevo.');
    }

    const mensaje = data as Mensaje;

    this.agregar(mensaje);
    void this.avisar(mensaje.id);

    return mensaje;
  }

  detener(): void {
    if (this._canal) {
      void this._db.client.removeChannel(this._canal);
      this._canal = undefined;
    }

    this.mensajes.set([]);
  }

  private suscribir(): void {
    this._canal = this._db.client
      .channel('sala-consultas')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensajes' },
        (payload) => this.agregar(payload.new as Mensaje)
      )
      .subscribe();
  }

  // evita el mensaje propio duplicado
  private agregar(mensaje: Mensaje): void {
    this.mensajes.update((actuales) => this.ordenar([...actuales, mensaje]));
  }

  private ordenar(lista: Mensaje[]): Mensaje[] {
    const sinRepetir = new Map<string, Mensaje>();

    for (const mensaje of lista) {
      sinRepetir.set(mensaje.id, mensaje);
    }

    return [...sinRepetir.values()]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .slice(-CHAT_LIMITE_MENSAJES);
  }

  // el aviso push no frena el envío
  private async avisar(idMensaje: string): Promise<void> {
    try {
      const { error } = await this._db.client.functions.invoke(
        'notify-chat-message',
        { body: { id_mensaje: idMensaje } }
      );

      if (error) {
        console.warn('No se pudo enviar la notificación del chat:', error);
      }
    } catch (error) {
      console.warn('No se pudo enviar la notificación del chat:', error);
    }
  }
}
