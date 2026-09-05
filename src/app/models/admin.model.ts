import { PerfilUsuario } from './usuario.model';

export interface AdminModule {
  id: string;
  title: string;
  description: string;
  icon: string;
  roles: PerfilUsuario[];
  path?: string; // Optional path property
}
