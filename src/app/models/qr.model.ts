// formato json de los qr: ingreso, mesa con id y propina con porcentaje

export const PORCENTAJES_PROPINA = [0, 5, 10, 15, 20] as const;

export type PorcentajePropina = (typeof PORCENTAJES_PROPINA)[number];

export type CodigoQr =
  | { tipo: 'ingreso-local' }
  | { tipo: 'mesa'; id: string }
  | { tipo: 'propina'; porcentaje: PorcentajePropina };
