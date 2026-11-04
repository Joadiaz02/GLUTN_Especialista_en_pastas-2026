import { inject, Injectable, signal } from '@angular/core';
import { PushNotificationService } from '../push-notification.service';
import { SupabaseService } from '../supabase.service';
import { EPerfilUsuario } from '@app/enums';
import type { PerfilUsuario } from '@app/models/usuario.model';
import { Storage } from '../storage';
import { Vibracion } from '../vibracion/vibracion';
import { User } from '../user';
import { Carrito } from '@app/pages/carrito/carrito';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

const CLAVE_PANTALLA_INGRESO = 'pantallaIngreso';

export type RedSocial = 'google' | 'discord';

// adónde vuelve Supabase en el celular después de la red social
export const ESQUEMA_RETORNO_SOCIAL = 'com.glutn.especialista://login-callback';

// datos que trae la red para precargar "Completá tu registro"
export interface DatosRedSocial {
  nombre: string;
  apellido: string;
  avatar: string | null;
  email: string;
  red: string;
}

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly supabaseService = inject(SupabaseService);
  private _userRepository = inject(User);
  private readonly carrito = inject(Carrito);
  private readonly storageService = inject(Storage);
  private readonly vibracion = inject(Vibracion);
  private readonly pushNotificationService = inject(PushNotificationService);
  usuarioActual = signal<any>(null);

  constructor() {
    // mantiene el usuario actual sincronizado con supabase
    this.supabaseService.client.auth.onAuthStateChange((_event, session) => {
      this.usuarioActual.set(session?.user ?? null);
    });
  }

  async obtenerUsuarioActual(): Promise<any> {
    const { data } = await this.supabaseService.client.auth.getSession();

    this.usuarioActual.set(data.session?.user ?? null);

    return this.usuarioActual();
  }

  obtenerPerfil(usuario: any = this.usuarioActual()): PerfilUsuario | null {
    const perfil = usuario?.user_metadata?.['perfil'];

    if (!perfil) {
      return null;
    }

    return perfil as PerfilUsuario;
  }

  esPersonal(usuario: any = this.usuarioActual()): boolean {
    const perfil = this.obtenerPerfil(usuario);

    return [
      EPerfilUsuario.Dueno,
      EPerfilUsuario.Supervisor,
      EPerfilUsuario.Metre,
      EPerfilUsuario.Mozo,
      EPerfilUsuario.Cocinero,
      EPerfilUsuario.Cantinero,
    ].includes(perfil as EPerfilUsuario);
  }

  async registerEmployee(request: any, role: string) {
    const avatarUrl = await this.storageService.uploadImage(
      request.profile.file
    );

    const { data, error } =
      await this.supabaseService.statelessClient.auth.signUp({
        email: request.credentials.email,
        password: request.credentials.password,
        options: {
          data: {
            apellido: request.personal.lastName,
            nombre: request.personal.name,
            documento: request.personal.dni,
            perfil: role,
            avatar: avatarUrl,
          },
        },
      });

    if (error) {
      throw error;
    }

    return data;
  }

  async register(request: any, role: EPerfilUsuario): Promise<void> {
    const avatarUrl = await this.storageService.uploadImage(
      request.profile.file
    );

    const { data, error } = await this.supabaseService.client.auth.signUp({
      email: request.credentials.email,
      password: request.credentials.password,
      options: {
        data: {
          apellido: request.personal.lastName,
          nombre: request.personal.name,
          documento: request.personal.dni,
          perfil: role,
          avatar: avatarUrl,
        },
      },
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error('No se pudo crear la cuenta.');
    }

    if (role !== EPerfilUsuario.ClienteRegistrado) {
      return;
    }

    const { error: errorCorreo } =
      await this.supabaseService.client.functions.invoke(
        'send-client-status-email',
        {
          body: {
            clienteId: data.user.id,
            estado: 'pendiente',
          },
        }
      );

    if (errorCorreo) {
      console.error(
        'La cuenta fue creada, pero no se pudo enviar el correo de pendiente:',
        errorCorreo
      );
    }

    if (data.session?.access_token) {
      const { error: errorPush } =
        await this.supabaseService.client.functions.invoke(
          'notify-pending-client',
          {
            body: {
              clienteId: data.user.id,
            },
            headers: {
              Authorization: `Bearer ${data.session.access_token}`,
            },
          }
        );

      if (errorPush) {
        console.error(
          'La cuenta fue creada, pero no se pudo notificar a los gestores:',
          errorPush
        );
      }
    } else {
      console.warn(
        'La cuenta fue creada, pero Supabase no devolvió una sesión para enviar la notificación Push.'
      );
    }
  }

  async iniciarsecion(request: {
    email: string;
    password: string;
  }): Promise<any> {
    const { data, error } =
      await this.supabaseService.client.auth.signInWithPassword({
        email: request.email,
        password: request.password,
      });

    if (error) {
      throw new Error(`Login fallido: ${error.message}`);
    }

    if (!data.user) {
      throw new Error('Login fallido: no se retorno un usuario');
    }

    return this.validarIngreso(data.user);
  }

  // valida el estado de aprobación del cliente registrado (correo o red social)
  async validarIngreso(usuario: any): Promise<any> {
    const perfil = usuario.user_metadata?.['perfil'];

    if (perfil !== EPerfilUsuario.ClienteRegistrado) {
      this.usuarioActual.set(usuario);

      return usuario;
    }

    const { data: estado, error: errorEstado } =
      await this.supabaseService.client.rpc('obtener_estado_aprobacion');

    if (errorEstado) {
      await this.supabaseService.client.auth.signOut();

      this.usuarioActual.set(null);

      throw new Error('No se pudo verificar el estado de la cuenta.');
    }

    if (estado === 'pendiente') {
      await this.supabaseService.client.auth.signOut();

      this.usuarioActual.set(null);

      throw new Error('CUENTA_PENDIENTE');
    }

    if (estado === 'rechazado') {
      await this.supabaseService.client.auth.signOut();

      this.usuarioActual.set(null);

      throw new Error('CUENTA_RECHAZADA');
    }

    if (estado === 'aprobado') {
      this.usuarioActual.set(usuario);

      return usuario;
    }

    await this.supabaseService.client.auth.signOut();

    this.usuarioActual.set(null);

    throw new Error('No se pudo verificar el estado de la cuenta.');
  }

  // ingreso con redes sociales

  private urlRetornoSocial(): string {
    return Capacitor.isNativePlatform()
      ? ESQUEMA_RETORNO_SOCIAL
      : `${window.location.origin}/login`;
  }

  async iniciarConRed(red: RedSocial): Promise<void> {
    const esNativo = Capacitor.isNativePlatform();

    const { data, error } =
      await this.supabaseService.client.auth.signInWithOAuth({
        provider: red,
        options: {
          redirectTo: this.urlRetornoSocial(),
          // en el celular abrimos nosotros el navegador; en web redirige Supabase
          skipBrowserRedirect: esNativo,
          // Google siempre deja elegir la cuenta (Discord ya tiene "¿No sos vos?")
          queryParams:
            red === 'google' ? { prompt: 'select_account' } : undefined,
        },
      });

    if (error) {
      throw error;
    }

    if (esNativo && data.url) {
      await Browser.open({ url: data.url, toolbarColor: '#657A4D' });
    }
  }

  async vincularRed(red: RedSocial): Promise<void> {
    const esNativo = Capacitor.isNativePlatform();

    const { data, error } =
      await this.supabaseService.client.auth.linkIdentity({
        provider: red,
        options: {
          redirectTo: this.urlRetornoSocial(),
          skipBrowserRedirect: esNativo,
          queryParams:
            red === 'google' ? { prompt: 'select_account' } : undefined,
        },
      });

    if (error) {
      throw error;
    }

    if (esNativo && data.url) {
      await Browser.open({ url: data.url, toolbarColor: '#657A4D' });
    }
  }

  async redesVinculadas(): Promise<RedSocial[]> {
    const { data, error } =
      await this.supabaseService.client.auth.getUserIdentities();

    if (error) {
      throw error;
    }

    return (data?.identities ?? [])
      .map((identidad) => identidad.provider)
      .filter(
        (proveedor): proveedor is RedSocial =>
          proveedor === 'google' || proveedor === 'discord'
      );
  }

  // canjea la vuelta de la red por una sesión y valida el perfil
  async completarIngresoSocial(url: string): Promise<any> {
    const parametros = new URL(url).searchParams;

    if (parametros.get('error')) {
      throw new Error('INGRESO_SOCIAL_CANCELADO');
    }

    let usuario: any = null;

    if (Capacitor.isNativePlatform()) {
      const codigo = parametros.get('code');

      if (!codigo) {
        throw new Error('INGRESO_SOCIAL_SIN_CODIGO');
      }

      const { data, error } =
        await this.supabaseService.client.auth.exchangeCodeForSession(codigo);

      if (error) {
        throw error;
      }

      usuario = data.user;
    } else {
      // en web supabase-js ya canjeó el ?code= al cargar la página
      const { data } = await this.supabaseService.client.auth.getSession();

      usuario = data.session?.user ?? null;
    }

    if (!usuario) {
      throw new Error('INGRESO_SOCIAL_SIN_CODIGO');
    }

    this.usuarioActual.set(usuario);

    // cuenta de red sin vincular: todavía no tiene perfil de GLUTN
    if (!this.obtenerPerfil(usuario)) {
      throw new Error('PERFIL_INCOMPLETO');
    }

    return this.validarIngreso(usuario);
  }

  datosRedSocial(usuario: any = this.usuarioActual()): DatosRedSocial {
    const metadata = usuario?.user_metadata ?? {};

    const nombreCompleto: string = (
      metadata['full_name'] ??
      metadata['name'] ??
      metadata['custom_claims']?.['global_name'] ??
      ''
    ).trim();

    // Google trae nombre y apellido por separado; Discord, un solo nombre
    const nombre: string =
      metadata['given_name'] ?? nombreCompleto.split(' ')[0] ?? '';

    const apellido: string =
      metadata['family_name'] ??
      nombreCompleto.split(' ').slice(1).join(' ') ??
      '';

    return {
      nombre,
      apellido,
      avatar: metadata['avatar_url'] ?? metadata['picture'] ?? null,
      email: usuario?.email ?? '',
      red: usuario?.app_metadata?.['provider'] ?? '',
    };
  }

  // la cuenta de la red queda también con correo y contraseña
  async establecerContrasena(password: string): Promise<void> {
    const { error } = await this.supabaseService.client.auth.updateUser({
      password,
    });

    if (error) {
      throw error;
    }
  }

  async completarRegistroSocial(datos: {
    nombre: string;
    apellido: string;
    documento: string;
    avatar: string | null;
  }): Promise<void> {
    const { error } = await this.supabaseService.client.rpc(
      'completar_registro_social',
      {
        p_nombre: datos.nombre,
        p_apellido: datos.apellido,
        p_documento: datos.documento,
        p_avatar: datos.avatar,
      }
    );

    if (error) {
      throw error;
    }

    // trae la metadata nueva (perfil = cliente_registrado) a la sesión
    const { data: sesion, error: errorSesion } =
      await this.supabaseService.client.auth.refreshSession();

    if (errorSesion || !sesion.user) {
      throw errorSesion ?? new Error('No se pudo actualizar la sesión.');
    }

    const clienteId = sesion.user.id;

    // mismo aviso que el registro con correo
    const { error: errorCorreo } =
      await this.supabaseService.client.functions.invoke(
        'send-client-status-email',
        { body: { clienteId, estado: 'pendiente' } }
      );

    if (errorCorreo) {
      console.error(
        'Registro social completo, pero no se pudo enviar el correo de pendiente:',
        errorCorreo
      );
    }

    const { error: errorPush } =
      await this.supabaseService.client.functions.invoke(
        'notify-pending-client',
        { body: { clienteId } }
      );

    if (errorPush) {
      console.error(
        'Registro social completo, pero no se pudo notificar a los gestores:',
        errorPush
      );
    }

    // queda pendiente: no puede seguir logueado
    await this.supabaseService.client.auth.signOut();

    this.usuarioActual.set(null);
  }

  // cambia la foto de perfil (cuenta + tabla usuarios, que usan el chat y los listados)
  async actualizarAvatar(file: File): Promise<string> {
    const avatar = await this.storageService.uploadImage(file);

    const { error } = await this.supabaseService.client.rpc(
      'actualizar_avatar',
      { p_avatar: avatar }
    );

    if (error) {
      throw error;
    }

    const { data, error: errorSesion } =
      await this.supabaseService.client.auth.refreshSession();

    if (errorSesion) {
      throw errorSesion;
    }

    this.usuarioActual.set(data.user ?? null);

    return avatar;
  }

async logout(): Promise<void> {
  this.vibracion.sonidoCierre();
  this.carrito.vaciar();

  try {
    await this.pushNotificationService.desvincularDispositivo();
  } catch (error) {
    console.error(
      'No se pudo desvincular el dispositivo push:',
      error
    );
  }

  const { error } =
    await this.supabaseService.client.auth.signOut();

  if (error) {
    throw error;
  }

  this.usuarioActual.set(null);
}

  estaLogueado(): boolean {
    return this.usuarioActual() !== null;
  }

  // recuerda por qué pantalla ingresó el usuario
  registrarPantallaIngreso(ruta: string): void {
    sessionStorage.setItem(CLAVE_PANTALLA_INGRESO, ruta);
  }

  obtenerPantallaIngreso(): string {
    return sessionStorage.getItem(CLAVE_PANTALLA_INGRESO) ?? '/login';
  }

  async loginAnonymous(fullName: string, file: File): Promise<string> {
    const avatar = await this.storageService.uploadImage(file);

    console.log("auth.ts 255");
    console.log(avatar);
    
    const { data: authData, error: authError } =
      await this.supabaseService.client.auth.signInAnonymously({
        options: {
          data: {
            nombre: fullName.split(' ')[0],
            apellido: fullName.split(' ')[1],
            perfil: 'cliente_anonimo',
            avatar: avatar,
          },
        },
      });
      
    console.log("auth.ts 270");
    console.log(authData);

    console.log("auth.ts 273");
    console.log(authError);

    if (authError) throw authError;

    console.log(authData);

    const userId = authData.user!.id;

    console.log(userId);

    return userId;
  }
}