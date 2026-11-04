import type { TipoCocina } from '@app/services';

export interface ConfigCartaCocina {
  singular: string;
  plural: string;
  ruta: string;
}

// los dos son masculinos, así que los textos se arman igual
export const CARTA_COCINA: Record<TipoCocina, ConfigCartaCocina> = {
  plato: { singular: 'plato', plural: 'platos', ruta: '/admin/dishes' },
  postre: { singular: 'postre', plural: 'postres', ruta: '/admin/postres' },
};
