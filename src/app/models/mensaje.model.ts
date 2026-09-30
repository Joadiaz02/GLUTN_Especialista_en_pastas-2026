import type { PerfilUsuario } from './usuario.model';

// mensaje de la sala de consultas entre mozos y clientes
export interface Mensaje {
  id: string;

  id_autor: string;

  nombre: string;

  perfil: PerfilUsuario;

  numero_mesa: string | null;

  // avatar del autor al momento de escribir
  foto: string | null;

  texto: string;

  en_respuesta_a: string | null;

  created_at: string;
}
