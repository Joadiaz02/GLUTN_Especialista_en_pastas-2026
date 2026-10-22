const TABLE_PREFIX = 'mesa:';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const buildTableQrContent = (tableId: string): string =>
  `${TABLE_PREFIX}${tableId}`;

export function parseTableQr(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith(TABLE_PREFIX)) return null;

  const id = trimmed.slice(TABLE_PREFIX.length);
  return UUID_REGEX.test(id) ? id : null;
}

//qr punto 21

const TIP_PREFIX = 'propina:';

export const NIVELES_PROPINA = [
  { porcentaje: 20, nombre: 'Excelente' },
  { porcentaje: 15, nombre: 'Muy bueno' },
  { porcentaje: 10, nombre: 'Bueno' },
  { porcentaje: 5, nombre: 'Regular' },
  { porcentaje: 0, nombre: 'Malo' },
];

export const buildTipQrContent = (porcentaje: number): string =>
  `${TIP_PREFIX}${porcentaje}`;

// devuelve el porcentaje, o null si el código no es de propina
export function parseTipQr(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith(TIP_PREFIX)) return null;

  const valor = trimmed.slice(TIP_PREFIX.length);

  for (const nivel of NIVELES_PROPINA) {
    if (String(nivel.porcentaje) === valor) return nivel.porcentaje;
  }

  return null;
}