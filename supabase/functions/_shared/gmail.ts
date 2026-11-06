export interface AdjuntoCorreo {
  nombreArchivo: string;
  tipoMime: string;
  contenido: Uint8Array;
}

function bytesABase64(bytes: Uint8Array): string {
  let binario = '';
  const tamanoBloque = 8192;

  for (let i = 0; i < bytes.length; i += tamanoBloque) {
    binario += String.fromCharCode(...bytes.subarray(i, i + tamanoBloque));
  }

  return btoa(binario);
}

// los correos exigen líneas de, como máximo, 76 caracteres
function partirEnLineas(base64: string): string {
  return base64.match(/.{1,76}/g)?.join('\r\n') ?? '';
}

function encodeHeader(
  value: string
): string {

  const bytes =
    new TextEncoder().encode(value);

  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return `=?UTF-8?B?${btoa(binary)}?=`;
}

function encodeBase64Url(
  value: string
): string {

  const bytes =
    new TextEncoder().encode(value);

  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function obtenerAccessTokenGoogle(): Promise<string> {

  const clientId =
    Deno.env.get('GOOGLE_CLIENT_ID');

  const clientSecret =
    Deno.env.get('GOOGLE_CLIENT_SECRET');

  const refreshToken =
    Deno.env.get('GOOGLE_REFRESH_TOKEN');

  if (
    !clientId ||
    !clientSecret ||
    !refreshToken
  ) {
    throw new Error(
      'Faltan credenciales de Google.'
    );
  }

  const response = await fetch(
    'https://oauth2.googleapis.com/token',
    {
      method: 'POST',

      headers: {
        'Content-Type':
          'application/x-www-form-urlencoded',
      },

      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    }
  );

  const data =
    await response.json();

  if (
    !response.ok ||
    !data.access_token
  ) {

    console.error(
      'Error obteniendo access token:',
      data
    );

    throw new Error(
      'No se pudo obtener el access token de Gmail.'
    );
  }

  return data.access_token;
}

// Sin adjuntos el mensaje sale igual que siempre.
// Con adjuntos se arma un correo "multipart" con el HTML y los archivos.
function crearMensajeMime(
  from: string,
  fromName: string,
  destinatario: string,
  asunto: string,
  html: string,
  adjuntos: AdjuntoCorreo[]
): string {

  const cabeceras = [
    `From: ${encodeHeader(fromName)} <${from}>`,
    `To: ${destinatario}`,
    `Subject: ${encodeHeader(asunto)}`,
    'MIME-Version: 1.0',
  ];

  if (adjuntos.length === 0) {
    return [
      ...cabeceras,
      'Content-Type: text/html; charset=UTF-8',
      '',
      html,
    ].join('\r\n');
  }

  const frontera =
    `glutn_${crypto.randomUUID().replaceAll('-', '')}`;

  const partes = [
    ...cabeceras,
    `Content-Type: multipart/mixed; boundary="${frontera}"`,
    '',
    `--${frontera}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    partirEnLineas(
      bytesABase64(new TextEncoder().encode(html))
    ),
  ];

  for (const adjunto of adjuntos) {
    partes.push(
      `--${frontera}`,
      `Content-Type: ${adjunto.tipoMime}; name="${adjunto.nombreArchivo}"`,
      `Content-Disposition: attachment; filename="${adjunto.nombreArchivo}"`,
      'Content-Transfer-Encoding: base64',
      '',
      partirEnLineas(bytesABase64(adjunto.contenido))
    );
  }

  partes.push(`--${frontera}--`, '');

  return partes.join('\r\n');
}

export async function enviarGmail(
  destinatario: string,
  asunto: string,
  html: string,
  adjuntos: AdjuntoCorreo[] = []
): Promise<void> {

  const from =
    Deno.env.get(
      'GMAIL_FROM_EMAIL'
    );

  const fromName =
    Deno.env.get(
      'GMAIL_FROM_NAME'
    );

  if (
    !from ||
    !fromName
  ) {
    throw new Error(
      'Faltan las variables de Gmail.'
    );
  }

  const accessToken =
    await obtenerAccessTokenGoogle();

  const rawMessage = crearMensajeMime(
    from,
    fromName,
    destinatario,
    asunto,
    html,
    adjuntos
  );

  const encodedMessage =
    encodeBase64Url(
      rawMessage
    );

  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',

      headers: {
        Authorization:
          `Bearer ${accessToken}`,

        'Content-Type':
          'application/json',
      },

      body: JSON.stringify({
        raw: encodedMessage,
      }),
    }
  );

  const data =
    await response.json();

  if (!response.ok) {

    console.error(
      'Error enviando Gmail:',
      data
    );

    throw new Error(
      'Gmail no pudo enviar el correo.'
    );
  }
}