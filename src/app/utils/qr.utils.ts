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