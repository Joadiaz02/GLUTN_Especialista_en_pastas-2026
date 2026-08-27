export type PerfilUsuario =
  | 'dueno'
  | 'supervisor'
  | 'metre'
  | 'mozo'
  | 'cocinero'
  | 'cantinero'
  | 'cliente_registrado'
  | 'cliente_anonimo';

export interface Usuario {
  id: string;
  apellido: string;
  nombre: string;
  documento: string;
  perfil: PerfilUsuario;
}