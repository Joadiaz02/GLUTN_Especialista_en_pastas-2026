
import { escapeHtml } from './html.ts';

const LOGO_URL =
  'https://tjdzkzopfhsharkgwvjh.supabase.co/storage/v1/object/public/images/logo/LOGO-GLUTN.png';

// Fondo de color sólido. El degradado de un solo color evita que Gmail/iOS
// "reinterpreten" el color cuando el celular está en modo oscuro.
function solido(color: string): string {
  return `background:${color};background-image:linear-gradient(${color},${color});`;
}

function crearDocumentoEmail(
  etiqueta: string,
  contenido: string,
  fuente: string,
  fondo = '#657A4D'
): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <style>
    :root { color-scheme: light only; supported-color-schemes: light only; }
    body { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }

    /* Celulares: las tarjetas pasan de ir una al lado de la otra a ir una debajo de la otra */
    @media only screen and (max-width: 560px) {
      td.tile {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
        padding: 16px 14px !important;
      }
      td.tile-gap {
        display: block !important;
        width: 100% !important;
        height: 10px !important;
        line-height: 10px !important;
        font-size: 0 !important;
      }
    }
  </style>
  <title>GLUTN - ${escapeHtml(etiqueta)}</title>

  <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600;1,700&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
</head>

<body bgcolor="${fondo}" style="margin:0;padding:0;${solido(fondo)}font-family:${fuente};">
  ${contenido}
</body>
</html>
`;
}

// ======================================================
// 1. REGISTRO PENDIENTE
// Diseño: oliva, amigable e institucional
// Tipografía: Nunito Sans
// ======================================================

export function crearEmailPendiente(
  nombre: string,
  apellido: string
): string {
  const nombreCompleto =
    `${nombre} ${apellido}`.trim();

  return crearDocumentoEmail(
    'Registro pendiente',
    `
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      role="presentation"
      style="
        background:#657A4D;
        padding:40px 15px;
        font-family:'Nunito Sans',Arial,sans-serif;
      "
    >
      <tr>
        <td align="center">

          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            border="0"
            role="presentation"
            style="max-width:580px;"
          >

            <!-- CABECERA -->
            <tr>
              <td align="center" style="padding:5px 20px 28px;">

                <img
                  src="${LOGO_URL}"
                  alt="GLUTN - Especialista en Pastas"
                  width="135"
                  style="
                    display:block;
                    width:135px;
                    height:auto;
                    border:0;
                  "
                >

                <p style="
                  margin:13px 0 0;
                  color:#F3EEDC;
                  font-size:11px;
                  font-weight:900;
                  letter-spacing:3px;
                ">
                  BIENVENIDO A GLUTN
                </p>

              </td>
            </tr>

            <!-- CONTENIDO -->
            <tr>
              <td style="
                background:#E5E8D8;
                border-radius:20px;
                padding:38px 36px;
              ">

                <p style="
                  margin:0 0 13px;
                  color:#657A4D;
                  font-size:11px;
                  font-weight:900;
                  letter-spacing:2px;
                ">
                  REGISTRO RECIBIDO
                </p>

                <h1 style="
                  margin:0 0 18px;
                  color:#26351D;
                  font-family:'Nunito Sans',Arial,sans-serif;
                  font-size:32px;
                  line-height:1.2;
                  font-weight:900;
                ">
                  ¡Hola, ${escapeHtml(nombreCompleto)}!
                </h1>

                <p style="
                  margin:0 0 27px;
                  color:#59664D;
                  font-size:15px;
                  line-height:1.9;
                  font-weight:600;
                ">
                  Tu cuenta en GLUTN fue creada correctamente.
                  Nos alegra que quieras formar parte de nuestra
                  comunidad.
                </p>

                <!-- ESTADO -->
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  role="presentation"
                  style="
                    background:#D5DFC5;
                    border-radius:14px;
                    border-left:5px solid #D9A441;
                  "
                >
                  <tr>
                    <td style="padding:24px;">

                      <p style="
                        margin:0 0 9px;
                        color:#657A4D;
                        font-size:10px;
                        font-weight:900;
                        letter-spacing:2px;
                      ">
                        ESTADO ACTUAL
                      </p>

                      <p style="
                        margin:0;
                        color:#26351D;
                        font-size:22px;
                        font-weight:900;
                      ">
                        Pendiente de aprobación
                      </p>

                      <p style="
                        margin:9px 0 0;
                        color:#59664D;
                        font-size:13px;
                        line-height:1.7;
                        font-weight:600;
                      ">
                        La administración está revisando tus datos.
                      </p>

                    </td>
                  </tr>
                </table>

                <h2 style="
                  margin:30px 0 19px;
                  color:#26351D;
                  font-size:20px;
                  font-weight:900;
                ">
                  ¿Qué sucede ahora?
                </h2>

                <!-- PASO 1 -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                  <tr>
                    <td width="40" valign="top">
                      <table width="29" height="29" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:#657A4D;border-radius:50%;">
                        <tr>
                          <td align="center" valign="middle" style="color:#F3EEDC;font-size:13px;font-weight:900;">
                            1
                          </td>
                        </tr>
                      </table>
                    </td>

                    <td style="padding:4px 0 20px;">
                      <p style="margin:0;color:#26351D;font-size:14px;font-weight:900;">
                        Registro completado
                      </p>
                      <p style="margin:5px 0 0;color:#59664D;font-size:12px;line-height:1.6;">
                        Recibimos correctamente tu solicitud.
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td width="40" valign="top">
                      <table width="29" height="29" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:#D9A441;border-radius:50%;">
                        <tr>
                          <td align="center" valign="middle" style="color:#26351D;font-size:13px;font-weight:900;">
                            2
                          </td>
                        </tr>
                      </table>
                    </td>

                    <td style="padding:4px 0 20px;">
                      <p style="margin:0;color:#26351D;font-size:14px;font-weight:900;">
                        Revisión administrativa
                      </p>
                      <p style="margin:5px 0 0;color:#59664D;font-size:12px;line-height:1.6;">
                        Tu solicitud se encuentra en esta etapa.
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td width="40" valign="top">
                      <table width="29" height="29" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:#A8B68A;border-radius:50%;">
                        <tr>
                          <td align="center" valign="middle" style="color:#26351D;font-size:13px;font-weight:900;">
                            3
                          </td>
                        </tr>
                      </table>
                    </td>

                    <td style="padding:4px 0 0;">
                      <p style="margin:0;color:#26351D;font-size:14px;font-weight:900;">
                        Notificación del resultado
                      </p>
                      <p style="margin:5px 0 0;color:#59664D;font-size:12px;line-height:1.6;">
                        Te enviaremos otro correo cuando sea gestionada.
                      </p>
                    </td>
                  </tr>
                </table>

                <p style="
                  margin:29px 0 0;
                  padding-top:20px;
                  border-top:1px solid #C6D0B8;
                  color:#657A4D;
                  font-size:13px;
                  font-weight:900;
                ">
                  ¡Gracias por elegir GLUTN!
                </p>

              </td>
            </tr>

            <!-- PIE -->
            <tr>
              <td align="center" style="padding:25px 15px 0;">

                <p style="
                  margin:0;
                  color:#F3EEDC;
                  font-size:18px;
                  font-weight:900;
                ">
                  Administración GLUTN
                </p>

                <p style="
                  margin:7px 0 0;
                  color:#D9A441;
                  font-size:10px;
                  font-weight:800;
                  letter-spacing:2px;
                ">
                  ESPECIALISTA EN PASTAS
                </p>

              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
    `,
    "'Nunito Sans', Arial, sans-serif"
  );
}

// ======================================================
// 2. CUENTA APROBADA
// Diseño: celebración, luminoso, centrado y de esquinas redondeadas
// Paleta: crema + verde profundo + dorado
// Tipografía: Playfair Display (serif cursiva)
// ======================================================

// ======================================================
// 2. CUENTA APROBADA
// Diseño: celebración, centrado, esquinas redondeadas
// Paleta: arena dorada + crema + verde profundo + dorado (sin blancos)
// Tipografía: Playfair Display (serif cursiva)
// ======================================================

export function crearEmailAprobacion(
  nombre: string,
  apellido: string
): string {
  const nombreCompleto =
    `${nombre} ${apellido}`.trim();

  const SERIF =
    "'Playfair Display', Georgia, 'Times New Roman', serif";

  const confeti = ['#F2C14E', '#2F5D3A', '#E0693B']
    .concat(['#F2C14E', '#2F5D3A', '#E0693B'])
    .concat(['#F2C14E', '#2F5D3A', '#E0693B'])
    .concat(['#F2C14E', '#2F5D3A', '#E0693B'])
    .map(
      (color) =>
        `<td width="8.33%" height="10" bgcolor="${color}" style="${solido(color)}font-size:0;line-height:0;">&nbsp;</td>`
    )
    .join('');

  return crearDocumentoEmail(
    'Cuenta aprobada',
    `
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      role="presentation"
      bgcolor="#EAD9A0"
      style="
        ${solido('#EAD9A0')}
        padding:40px 15px;
        font-family:${SERIF};
      "
    >
      <tr>
        <td align="center">

          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            border="0"
            role="presentation"
            bgcolor="#F8EBC1"
            style="
              max-width:600px;
              ${solido('#F8EBC1')}
              border:3px solid #2F5D3A;
              border-radius:30px;
              overflow:hidden;
            "
          >

            <!-- CABECERA VERDE -->
            <tr>
              <td
                align="center"
                bgcolor="#2F5D3A"
                style="
                  ${solido('#2F5D3A')}
                  padding:38px 30px 30px;
                "
              >

                <img
                  src="${LOGO_URL}"
                  alt="GLUTN - Especialista en Pastas"
                  width="130"
                  style="
                    display:block;
                    width:130px;
                    height:auto;
                    border:0;
                  "
                >

                <p style="
                  margin:20px 0 0;
                  color:#F2C14E;
                  font-family:${SERIF};
                  font-size:19px;
                  font-style:italic;
                  font-weight:600;
                  letter-spacing:1px;
                ">
                  ✦ ¡Bienvenido a la familia! ✦
                </p>

              </td>
            </tr>

            <!-- TIRA DE CONFETI -->
            <tr>
              <td style="padding:0;">
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  role="presentation"
                >
                  <tr>${confeti}</tr>
                </table>
              </td>
            </tr>

            <!-- CUERPO -->
            <tr>
              <td align="center" style="padding:46px 34px 20px;">

                <!-- SELLO DORADO -->
                <table
                  width="96"
                  height="96"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  role="presentation"
                  bgcolor="#F2C14E"
                  style="
                    width:96px;
                    height:96px;
                    ${solido('#ebbd29')}
                    border:6px solid #FBE29A;
                    border-radius:50%;
                  "
                >
                  <tr>
                    <td
                      align="center"
                      valign="middle"
                      style="
                        color:#2F5D3A;
                        font-family:Georgia,serif;
                        font-size:48px;
                        font-weight:700;
                      "
                    >
                      ✓
                    </td>
                  </tr>
                </table>

                <p style="
                  margin:26px 0 8px;
                  color:#B8461C;
                  font-family:${SERIF};
                  font-size:19px;
                  font-style:italic;
                  font-weight:700;
                  letter-spacing:2px;
                ">
                  ¡Felicitaciones!
                </p>

                <h1 style="
                  margin:0;
                  color:#2F5D3A;
                  font-family:${SERIF};
                  font-size:42px;
                  line-height:1.15;
                  font-style:italic;
                  font-weight:800;
                ">
                  ¡Tu cuenta fue aprobada!
                </h1>

                <p style="
                  margin:22px 0 0;
                  color:#3F3D2B;
                  font-family:${SERIF};
                  font-size:20px;
                  line-height:1.7;
                ">
                  Hola, <strong style="color:#2F5D3A;">${escapeHtml(nombreCompleto)}</strong>.<br>
                  La administración revisó tu solicitud y ya
                  sos parte oficial de GLUTN.
                </p>

              </td>
            </tr>

            <!-- TRES TARJETAS: cada tarjeta ES la celda de la fila,
                 así las tres miden siempre lo mismo de alto.
                 En celular se apilan (ver el estilo responsive del head) -->
            <tr>
              <td style="padding:14px 24px 10px;">

                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  role="presentation"
                >
                  <tr>

                    <td
                      class="tile"
                      width="32%"
                      valign="top"
                      align="center"
                      bgcolor="#CFE3BF"
                      style="${solido('#CFE3BF')}border-radius:18px;padding:20px 8px;"
                    >
                      <p style="margin:0;font-size:32px;line-height:1;">🔑</p>
                      <p style="margin:10px 0 0;color:#1F4A2A;font-family:${SERIF};font-size:17px;font-weight:700;line-height:1.4;">
                        Ya podés iniciar sesión
                      </p>
                    </td>

                    <td class="tile-gap" width="2%" style="font-size:0;line-height:0;">&nbsp;</td>

                    <td
                      class="tile"
                      width="32%"
                      valign="top"
                      align="center"
                      bgcolor="#80f67a"
                      style="${solido('#9ef67aa1')}border-radius:18px;padding:20px 8px;"
                    >
                      <p style="margin:0;font-size:32px;line-height:1;">🍝</p>
                      <p style="margin:10px 0 0;color:#5A3E05;font-family:${SERIF};font-size:17px;font-weight:700;line-height:1.4;">
                        Descubrí nuestro menú
                      </p>
                    </td>

                    <td class="tile-gap" width="2%" style="font-size:0;line-height:0;">&nbsp;</td>

                    <td
                      class="tile"
                      width="32%"
                      valign="top"
                      align="center"
                      bgcolor="#F4B99B"
                      style="${solido('#F4B99B')}border-radius:18px;padding:20px 8px;"
                    >
                      <p style="margin:0;font-size:32px;line-height:1;">🥂</p>
                      <p style="margin:10px 0 0;color:#6E270D;font-family:${SERIF};font-size:17px;font-weight:700;line-height:1.4;">
                        Disfrutá la experiencia
                      </p>
                    </td>

                  </tr>
                </table>

              </td>
            </tr>

            <!-- FRASE DE CIERRE -->
            <tr>
              <td align="center" style="padding:26px 34px 40px;">

                <p style="
                  margin:0;
                  color:#2F5D3A;
                  font-family:${SERIF};
                  font-size:24px;
                  font-style:italic;
                  font-weight:700;
                  line-height:1.5;
                ">
                  “Una buena comida empieza con una buena bienvenida.”
                </p>

                <p style="
                  margin:14px 0 0;
                  color:#6B5A2A;
                  font-family:${SERIF};
                  font-size:18px;
                  font-style:italic;
                ">
                  ¡Buen provecho!
                </p>

              </td>
            </tr>

            <!-- PIE -->
            <tr>
              <td
                align="center"
                bgcolor="#F2C14E"
                style="
                  ${solido('#F2C14E')}
                  padding:26px 20px;
                "
              >

                <p style="
                  margin:0;
                  color:#2F5D3A;
                  font-family:${SERIF};
                  font-size:24px;
                  font-style:italic;
                  font-weight:800;
                ">
                  El equipo de GLUTN
                </p>

                <p style="
                  margin:8px 0 0;
                  color:#4A3B0C;
                  font-family:${SERIF};
                  font-size:15px;
                  font-weight:600;
                  letter-spacing:2px;
                ">
                  ESPECIALISTA EN PASTAS
                </p>

              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
    `,
    "'Playfair Display', Georgia, serif",
    '#EAD9A0'
  );
}

// ======================================================
// 3. CUENTA RECHAZADA
// Diseño: mismo lenguaje visual que la app (fondo oliva, tarjetas redondeadas,
// círculos con ícono, tipografía Manrope) pero en clave de rechazo:
// ícono × y acentos en rojo vino. Alineado a la izquierda. Sin blancos.
// ======================================================

export function crearEmailRechazo(
  nombre: string,
  apellido: string,
  motivo: string
): string {
  const nombreCompleto =
    `${nombre} ${apellido}`.trim();

  const FUENTE =
    "'Manrope', 'Segoe UI', Roboto, Arial, sans-serif";

  return crearDocumentoEmail(
    'Solicitud no aprobada',
    `
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      role="presentation"
      bgcolor="#657A4D"
      style="
        ${solido('#657A4D')}
        padding:32px 14px 40px;
        font-family:${FUENTE};
      "
    >
      <tr>
        <td align="center">

          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            border="0"
            role="presentation"
            style="max-width:600px;"
          >

            <!-- CABECERA: logo + etiqueta -->
            <tr>
              <td style="padding:0 6px 22px;">

                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  role="presentation"
                >
                  <tr>
                    <td valign="middle" align="left">

                      <img
                        src="${LOGO_URL}"
                        alt="GLUTN - Especialista en Pastas"
                        width="115"
                        style="
                          display:block;
                          width:115px;
                          height:auto;
                          border:0;
                        "
                      >

                    </td>

                    <td valign="middle" align="right">

                      <p style="
                        margin:0;
                        color:#F5E6C8;
                        font-family:${FUENTE};
                        font-size:16px;
                        font-weight:800;
                        letter-spacing:1px;
                      ">
                        Estado de tu solicitud
                      </p>

                    </td>
                  </tr>
                </table>

              </td>
            </tr>

            <!-- TARJETA PRINCIPAL (como las tarjetas de la app) -->
            <tr>
              <td
                bgcolor="#A8B68A"
                style="
                  ${solido('#A8B68A')}
                  border-radius:22px;
                  padding:36px 30px 34px;
                "
              >

                <!-- ÍCONO EN CÍRCULO (igual que los módulos de la app) -->
                <table
                  width="76"
                  height="76"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  role="presentation"
                  bgcolor="#8E2B2B"
                  style="
                    width:76px;
                    height:76px;
                    ${solido('#8E2B2B')}
                    border-radius:50%;
                  "
                >
                  <tr>
                    <td
                      align="center"
                      valign="middle"
                      style="
                        color:#F5E6C8;
                        font-family:Arial,Helvetica,sans-serif;
                        font-size:64px;
                        line-height:64px;
                        font-weight:700;
                      "
                    >
                      ×
                    </td>
                  </tr>
                </table>

                <p style="
                  margin:24px 0 10px;
                  color:#7A1F1F;
                  font-family:${FUENTE};
                  font-size:16px;
                  font-weight:800;
                  letter-spacing:2px;
                  text-transform:uppercase;
                ">
                  Solicitud no aprobada
                </p>

                <h1 style="
                  margin:0;
                  color:#4A1212;
                  font-family:${FUENTE};
                  font-size:36px;
                  line-height:1.2;
                  font-weight:800;
                ">
                  Tu registro no fue aprobado
                </h1>

                <p style="
                  margin:20px 0 0;
                  color:#262B1C;
                  font-family:${FUENTE};
                  font-size:19px;
                  line-height:1.7;
                  font-weight:600;
                ">
                  Hola, <strong>${escapeHtml(nombreCompleto)}</strong>.
                  La administración de GLUTN revisó tu solicitud
                  y decidió no aprobarla en esta oportunidad.
                </p>

                <!-- MOTIVO -->
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  role="presentation"
                  bgcolor="#8E2B2B"
                  style="
                    margin-top:28px;
                    ${solido('#8E2B2B')}
                    border-radius:16px;
                  "
                >
                  <tr>
                    <td style="padding:24px 24px 26px;">

                      <p style="
                        margin:0 0 12px;
                        color:#F3C4B4;
                        font-family:${FUENTE};
                        font-size:15px;
                        font-weight:800;
                        letter-spacing:2px;
                      ">
                        MOTIVO DE LA DECISIÓN
                      </p>

                      <p style="
                        margin:0;
                        color:#F5E6C8;
                        font-family:${FUENTE};
                        font-size:21px;
                        font-weight:700;
                        line-height:1.55;
                      ">
                        ${escapeHtml(motivo)}
                      </p>

                    </td>
                  </tr>
                </table>

                <!-- QUÉ PODÉS HACER -->
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  role="presentation"
                  bgcolor="#95A777"
                  style="
                    margin-top:22px;
                    ${solido('#95A777')}
                    border-radius:16px;
                  "
                >
                  <tr>
                    <td style="padding:24px;">

                      <p style="
                        margin:0 0 18px;
                        color:#262B1C;
                        font-family:${FUENTE};
                        font-size:22px;
                        font-weight:800;
                      ">
                        ¿Qué podés hacer?
                      </p>

                      <table
                        width="100%"
                        cellpadding="0"
                        cellspacing="0"
                        border="0"
                        role="presentation"
                      >
                        <tr>
                          <td width="52" valign="top" style="padding:0 0 16px;">
                            <table width="38" height="38" cellpadding="0" cellspacing="0" border="0" role="presentation" bgcolor="#657A4D" style="width:38px;height:38px;${solido('#657A4D')}border-radius:50%;">
                              <tr>
                                <td align="center" valign="middle" style="color:#F5E6C8;font-family:${FUENTE};font-size:19px;font-weight:800;">1</td>
                              </tr>
                            </table>
                          </td>
                          <td valign="top" style="padding:0 0 16px;color:#262B1C;font-family:${FUENTE};font-size:18px;line-height:1.6;font-weight:600;">
                            Leé con atención el motivo indicado más arriba.
                          </td>
                        </tr>
                        <tr>
                          <td width="52" valign="top" style="padding:0;">
                            <table width="38" height="38" cellpadding="0" cellspacing="0" border="0" role="presentation" bgcolor="#657A4D" style="width:38px;height:38px;${solido('#657A4D')}border-radius:50%;">
                              <tr>
                                <td align="center" valign="middle" style="color:#F5E6C8;font-family:${FUENTE};font-size:19px;font-weight:800;">2</td>
                              </tr>
                            </table>
                          </td>
                          <td valign="top" style="padding:0;color:#262B1C;font-family:${FUENTE};font-size:18px;line-height:1.6;font-weight:600;">
                            Si creés que hubo un error o necesitás más
                            información, comunicate con la administración
                            del restaurante.
                          </td>
                        </tr>
                      </table>

                    </td>
                  </tr>
                </table>

              </td>
            </tr>

            <!-- PIE -->
            <tr>
              <td align="left" style="padding:28px 8px 0;">

                <p style="
                  margin:0;
                  color:#F5E6C8;
                  font-family:${FUENTE};
                  font-size:22px;
                  font-weight:800;
                ">
                  Administración GLUTN
                </p>

                <p style="
                  margin:8px 0 0;
                  color:#EBCB86;
                  font-family:${FUENTE};
                  font-size:15px;
                  font-weight:800;
                  letter-spacing:2px;
                ">
                  ESPECIALISTA EN PASTAS
                </p>

                <p style="
                  margin:16px 0 0;
                  color:#E3EAD0;
                  font-family:${FUENTE};
                  font-size:15px;
                  line-height:1.6;
                  font-weight:600;
                ">
                  Mensaje automático. Por favor, no respondas a este correo.
                </p>

              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
    `,
    "'Manrope', 'Segoe UI', Roboto, Arial, sans-serif",
    '#657A4D'
  );
}