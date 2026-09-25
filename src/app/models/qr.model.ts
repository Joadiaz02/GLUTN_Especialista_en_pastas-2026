// Formato común de todos los QR de la app (texto JSON dentro del código).
// Quien genere un QR nuevo tiene que respetar este formato para que el
// escáner del Home lo reconozca:
//   Ingreso al local: {"tipo":"ingreso"}
//   Mesa:             {"tipo":"mesa","id":"<id de la mesa>"}
//   Propina:          {"tipo":"propina","porcentaje":20}   (0, 5, 10, 15 o 20)

export const PORCENTAJES_PROPINA = [0, 5, 10, 15, 20] as const;

export type PorcentajePropina = (typeof PORCENTAJES_PROPINA)[number];

export type CodigoQr =
  | { tipo: 'ingreso' }
  | { tipo: 'mesa'; id: string }
  | { tipo: 'propina'; porcentaje: PorcentajePropina };
