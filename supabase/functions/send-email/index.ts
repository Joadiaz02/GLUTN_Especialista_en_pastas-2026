const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

const GMAIL_SEND_URL =
  'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

function base64UrlEncode(value: string): string {
  const bytes = new TextEncoder().encode(value);

  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function encodeSubject(subject: string): string {
  const bytes = new TextEncoder().encode(subject);

  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return `=?UTF-8?B?${btoa(binary)}?=`;
}

function encodeHeader(value: string): string {
  const bytes = new TextEncoder().encode(value);

  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return `=?UTF-8?B?${btoa(binary)}?=`;
}

function crearMensajeMime(
  from: string,
  fromName: string,
  to: string,
  subject: string,
  html: string,
): string {
  return [
    `From: ${encodeHeader(fromName)} <${from}>`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    html,
  ].join('\r\n');
}

async function obtenerAccessToken(): Promise<string> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const refreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN');

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Faltan las credenciales de Google en los secrets de Supabase.',
    );
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    console.error('Error obteniendo access token:', data);

    throw new Error(
      'Google no pudo generar el access token.',
    );
  }

  return data.access_token;
}

async function enviarGmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const from = Deno.env.get('GMAIL_FROM_EMAIL');
  const fromName = Deno.env.get('GMAIL_FROM_NAME');

  if (!from || !fromName) {
    throw new Error(
      'Faltan GMAIL_FROM_EMAIL o GMAIL_FROM_NAME.',
    );
  }

  const accessToken = await obtenerAccessToken();

  const mimeMessage = crearMensajeMime(
    from,
    fromName,
    to,
    subject,
    html,
  );

  const raw = base64UrlEncode(mimeMessage);

  const response = await fetch(GMAIL_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Error de Gmail API:', data);

    throw new Error(
      `Gmail API respondió con ${response.status}.`,
    );
  }

  console.log(
    'Correo enviado correctamente. Message ID:',
    data.id,
  );
}

Deno.serve(async (request: Request) => {
  try {
    if (request.method !== 'POST') {
      return Response.json(
        {
          success: false,
          error: 'Método no permitido.',
        },
        {
          status: 405,
        },
      );
    }

    const body = await request.json();

    const to = body.to;
    const subject = body.subject;
    const html = body.html;

    if (!to || !subject || !html) {
      return Response.json(
        {
          success: false,
          error:
            'Los campos to, subject y html son obligatorios.',
        },
        {
          status: 400,
        },
      );
    }

    await enviarGmail(to, subject, html);

    return Response.json({
      success: true,
      message: 'Correo enviado correctamente.',
    });
  } catch (error) {
    console.error('Error send-email:', error);

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error desconocido.',
      },
      {
        status: 500,
      },
    );
  }
});