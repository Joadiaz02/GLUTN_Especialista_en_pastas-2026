function base64UrlEncode(value: Uint8Array): string {
  let binary = '';

  for (const byte of value) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function textoABase64Url(value: string): string {
  return base64UrlEncode(
    new TextEncoder().encode(value)
  );
}

function pemAArrayBuffer(pem: string): ArrayBuffer {
  const contenido = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  const binario = atob(contenido);
  const bytes = new Uint8Array(binario.length);

  for (let i = 0; i < binario.length; i++) {
    bytes[i] = binario.charCodeAt(i);
  }

  return bytes.buffer;
}

function obtenerCredencialesFirebase() {
  const projectId =
    Deno.env.get('FIREBASE_PROJECT_ID');

  const clientEmail =
    Deno.env.get('FIREBASE_CLIENT_EMAIL');

  const privateKeyRaw =
    Deno.env.get('FIREBASE_PRIVATE_KEY');

  if (
    !projectId ||
    !clientEmail ||
    !privateKeyRaw
  ) {
    throw new Error(
      'Faltan las credenciales de Firebase.'
    );
  }

  const privateKey =
    privateKeyRaw.replace(/\\n/g, '\n');

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

async function generarAssertion(): Promise<string> {
  const {
    clientEmail,
    privateKey,
  } = obtenerCredencialesFirebase();

  const ahora =
    Math.floor(Date.now() / 1000);

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const payload = {
    iss: clientEmail,
    scope:
      'https://www.googleapis.com/auth/firebase.messaging',
    aud:
      'https://oauth2.googleapis.com/token',
    iat: ahora,
    exp: ahora + 3600,
  };

  const encodedHeader =
    textoABase64Url(
      JSON.stringify(header)
    );

  const encodedPayload =
    textoABase64Url(
      JSON.stringify(payload)
    );

  const contenido =
    `${encodedHeader}.${encodedPayload}`;

  const keyData =
    pemAArrayBuffer(privateKey);

  const cryptoKey =
    await crypto.subtle.importKey(
      'pkcs8',
      keyData,
      {
        name:
          'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );

  const firma =
    await crypto.subtle.sign(
      {
        name:
          'RSASSA-PKCS1-v1_5',
      },
      cryptoKey,
      new TextEncoder().encode(
        contenido
      )
    );

  return `${contenido}.${base64UrlEncode(
    new Uint8Array(firma)
  )}`;
}

async function obtenerAccessToken(): Promise<string> {
  const assertion =
    await generarAssertion();

  const respuesta =
    await fetch(
      'https://oauth2.googleapis.com/token',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded',
        },
        body:
          new URLSearchParams({
            grant_type:
              'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion,
          }),
      }
    );

  const resultado =
    await respuesta.json();

  if (
    !respuesta.ok ||
    !resultado.access_token
  ) {
    console.error(
      'Respuesta de Google OAuth:',
      resultado
    );

    throw new Error(
      'No se pudo obtener el token de acceso de Firebase.'
    );
  }

  return resultado.access_token;
}

export async function enviarNotificacionFirebase(
  token: string,
  titulo: string,
  cuerpo: string,
  datos?: Record<string, string>
): Promise<void> {
  const {
    projectId,
  } = obtenerCredencialesFirebase();

  const accessToken =
    await obtenerAccessToken();

  const respuesta =
    await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify({
          message: {
            token,
            notification: {
              title: titulo,
              body: cuerpo,
            },
            // canal 'avisos' que crea la app, con aviso.wav y vibración
            android: {
              priority: 'high',
              notification: {
                channel_id: 'avisos',
                sound: 'aviso',
                default_vibrate_timings: true,
              },
            },
            ...(datos
              ? { data: datos }
              : {}),
          },
        }),
      }
    );

  const resultado =
    await respuesta.json();

  if (!respuesta.ok) {
    console.error(
      'Respuesta de Firebase FCM:',
      resultado
    );

    throw new Error(
      resultado?.error?.message ??
        'Firebase rechazó el envío de la notificación.'
    );
  }

  console.log(
    'Notificación enviada correctamente:',
    resultado.name
  );
}