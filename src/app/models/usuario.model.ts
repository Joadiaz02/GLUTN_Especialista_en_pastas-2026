export type PerfilUsuario =
  | 'dueno'
  | 'supervisor'
  | 'metre'
  | 'mozo'
  | 'cocinero'
  | 'cantinero'
  | 'cliente_registrado'
  | 'cliente_anonimo';

export type EstadoAprobacion =
  | 'pendiente'
  | 'aprobado'
  | 'rechazado';

export interface Usuario {
  id: string;

  apellido: string;

  nombre: string;

  documento: string;

  perfil: PerfilUsuario;

  avatar?: string | null;

  estado_aprobacion?: EstadoAprobacion;

  motivo_rechazo?: string | null;
}