import type { PerfilUsuario } from './usuario.model';

// Un mensaje de la sala de consultas entre mozos y clientes (punto 11).
// El autor, el nombre y el perfil los completa la base de datos, no la app.
export interface Mensaje {
  id: string;

  id_autor: string;

  nombre: string;

  perfil: PerfilUsuario;

  numero_mesa: string | null;

  // Avatar del autor al momento de escribir (copiado de usuarios.avatar por
  // la base). Puede ser una URL completa o una ruta del bucket "images".
  foto: string | null;

  texto: string;

  en_respuesta_a: string | null;

  created_at: string;
}
