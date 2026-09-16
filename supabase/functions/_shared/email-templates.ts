import { escapeHtml } from './html.ts';

const LOGO_URL =
  'https://tjdzkzopfhsharkgwvjh.supabase.co/storage/v1/object/public/images/logo/LOGO-GLUTN.png';

function crearBaseEmail(
  contenido: string,
  etiqueta: string
): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GLUTN - ${escapeHtml(etiqueta)}</title>
</head>

<body style="margin:0;padding:0;background:#657A4D;font-family:Arial,Helvetica,sans-serif;">

  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="background:#657A4D;padding:32px 16px;"
  >
    <tr>
      <td align="center">

        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="max-width:620px;background:#F3EEDC;border-radius:24px;overflow:hidden;"
        >

          <tr>
            <td
              align="center"
              style="background:#657A4D;padding:34px 24px 30px;"
            >
              <img
                src="${LOGO_URL}"
                alt="GLUTN - Especialista en Pastas"
                width="150"
                style="display:block;width:150px;max-width:100%;height:auto;border:0;"
              >
            </td>
          </tr>

          <tr>
            <td
              style="height:6px;background:#E76F45;font-size:0;line-height:0;"
            >
              &nbsp;
            </td>
          </tr>

          <tr>
            <td style="padding:38px 38px 34px;color:#26351D;">
              ${contenido}
            </td>
          </tr>

          <tr>
            <td
              align="center"
              style="background:#D9A441;padding:20px 24px;"
            >
              <p
                style="margin:0;color:#26351D;font-size:14px;font-weight:700;"
              >
                Administración GLUTN
              </p>

              <p
                style="margin:6px 0 0;color:#26351D;font-size:12px;"
              >
                Especialista en Pastas
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;
}

export function crearEmailPendiente(
  nombre: string,
  apellido: string
): string {
  const nombreCompleto =
    `${nombre} ${apellido}`.trim();

  return crearBaseEmail(
    `
      <p
        style="
          margin:0 0 12px;
          color:#E76F45;
          font-size:13px;
          font-weight:800;
          text-transform:uppercase;
          letter-spacing:1.2px;
        "
      >
        Registro recibido
      </p>

      <h1
        style="
          margin:0 0 24px;
          color:#26351D;
          font-size:30px;
          line-height:1.2;
          font-weight:800;
        "
      >
        ¡Hola, ${escapeHtml(nombreCompleto)}!
      </h1>

      <p
        style="
          margin:0 0 18px;
          color:#46543A;
          font-size:16px;
          line-height:1.7;
        "
      >
        Tu cuenta en GLUTN fue creada correctamente.
      </p>

      <table
        width="100%"
        cellpadding="0"
        cellspacing="0"
        border="0"
        style="
          margin:26px 0;
          background:#A8B68A;
          border-radius:16px;
        "
      >
        <tr>
          <td style="padding:22px 24px;">

            <p
              style="
                margin:0 0 8px;
                color:#26351D;
                font-size:12px;
                font-weight:800;
                text-transform:uppercase;
                letter-spacing:1px;
              "
            >
              Estado de la cuenta
            </p>

            <p
              style="
                margin:0;
                color:#26351D;
                font-size:19px;
                font-weight:800;
              "
            >
              Pendiente de aprobación
            </p>

          </td>
        </tr>
      </table>

      <p
        style="
          margin:0 0 16px;
          color:#46543A;
          font-size:16px;
          line-height:1.7;
        "
      >
        La administración del restaurante revisará tu solicitud.
      </p>

      <p
        style="
          margin:0;
          color:#46543A;
          font-size:16px;
          line-height:1.7;
        "
      >
        Cuando tu cuenta sea gestionada, recibirás un nuevo correo
        informándote el resultado.
      </p>
    `,
    'Cuenta pendiente'
  );
}

export function crearEmailAprobacion(
  nombre: string,
  apellido: string
): string {
  const nombreCompleto =
    `${nombre} ${apellido}`.trim();

  return crearBaseEmail(
    `
      <p
        style="
          margin:0 0 12px;
          color:#657A4D;
          font-size:13px;
          font-weight:800;
          text-transform:uppercase;
          letter-spacing:1.2px;
        "
      >
        Cuenta gestionada
      </p>

      <h1
        style="
          margin:0 0 24px;
          color:#26351D;
          font-size:30px;
          line-height:1.2;
          font-weight:800;
        "
      >
        ¡Tu cuenta fue aprobada!
      </h1>

      <p
        style="
          margin:0 0 18px;
          color:#46543A;
          font-size:16px;
          line-height:1.7;
        "
      >
        Hola, ${escapeHtml(nombreCompleto)}.
      </p>

      <table
        width="100%"
        cellpadding="0"
        cellspacing="0"
        border="0"
        style="
          margin:26px 0;
          background:#A8B68A;
          border-radius:16px;
        "
      >
        <tr>
          <td style="padding:22px 24px;">

            <p
              style="
                margin:0 0 8px;
                color:#26351D;
                font-size:12px;
                font-weight:800;
                text-transform:uppercase;
                letter-spacing:1px;
              "
            >
              Estado de la cuenta
            </p>

            <p
              style="
                margin:0;
                color:#26351D;
                font-size:19px;
                font-weight:800;
              "
            >
              ✓ Aprobada
            </p>

          </td>
        </tr>
      </table>

      <p
        style="
          margin:0 0 16px;
          color:#46543A;
          font-size:16px;
          line-height:1.7;
        "
      >
        La administración aprobó tu solicitud de registro
        en GLUTN - Especialista en Pastas.
      </p>

      <p
        style="
          margin:0;
          color:#46543A;
          font-size:16px;
          line-height:1.7;
        "
      >
        Ya podés iniciar sesión y comenzar a utilizar la aplicación.
      </p>
    `,
    'Cuenta aprobada'
  );
}

export function crearEmailRechazo(
  nombre: string,
  apellido: string,
  motivo: string
): string {
  const nombreCompleto =
    `${nombre} ${apellido}`.trim();

  return crearBaseEmail(
    `
      <p
        style="
          margin:0 0 12px;
          color:#E76F45;
          font-size:13px;
          font-weight:800;
          text-transform:uppercase;
          letter-spacing:1.2px;
        "
      >
        Cuenta gestionada
      </p>

      <h1
        style="
          margin:0 0 24px;
          color:#26351D;
          font-size:30px;
          line-height:1.2;
          font-weight:800;
        "
      >
        Solicitud no aprobada
      </h1>

      <p
        style="
          margin:0 0 18px;
          color:#46543A;
          font-size:16px;
          line-height:1.7;
        "
      >
        Hola, ${escapeHtml(nombreCompleto)}.
      </p>

      <p
        style="
          margin:0 0 22px;
          color:#46543A;
          font-size:16px;
          line-height:1.7;
        "
      >
        La administración de GLUTN revisó tu solicitud
        de registro y decidió no aprobarla.
      </p>

      <table
        width="100%"
        cellpadding="0"
        cellspacing="0"
        border="0"
        style="
          margin:26px 0;
          background:#E76F45;
          border-radius:16px;
        "
      >
        <tr>
          <td style="padding:22px 24px;">

            <p
              style="
                margin:0 0 10px;
                color:#F3EEDC;
                font-size:12px;
                font-weight:800;
                text-transform:uppercase;
                letter-spacing:1px;
              "
            >
              Motivo del rechazo
            </p>

            <p
              style="
                margin:0;
                color:#ffffff;
                font-size:16px;
                line-height:1.6;
              "
            >
              ${escapeHtml(motivo)}
            </p>

          </td>
        </tr>
      </table>

      <p
        style="
          margin:0;
          color:#46543A;
          font-size:16px;
          line-height:1.7;
        "
      >
        Si considerás que se trata de un error,
        podés comunicarte con la administración del restaurante.
      </p>
    `,
    'Cuenta no aprobada'
  );
}