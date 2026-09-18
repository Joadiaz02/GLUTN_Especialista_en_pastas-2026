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

export async function enviarGmail(
  destinatario: string,
  asunto: string,
  html: string
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

  const rawMessage = [
    `From: ${encodeHeader(fromName)} <${from}>`,
    `To: ${destinatario}`,
    `Subject: ${encodeHeader(asunto)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    html,
  ].join('\r\n');

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