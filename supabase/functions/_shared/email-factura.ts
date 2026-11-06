import { escapeHtml } from './html.ts';

import {
  calcularImportes,
  RESTAURANTE,
  type DatosFactura,
} from './factura-pdf.ts';

const LOGO_URL =
  'https://tjdzkzopfhsharkgwvjh.supabase.co/storage/v1/object/public/images/logo/LOGO-GLUTN.png';

// Tipografía redondeada (Nunito). Si el programa de correo no la carga,
// usa Trebuchet MS o Verdana, que tampoco se parecen a Arial ni a una serif.
const FUENTE =
  "'Nunito', 'Trebuchet MS', Verdana, sans-serif";

// Gama de rojos y rosas: sin verdes, sin amarillos, sin blancos y sin tonos
// muy claros ni muy oscuros. Cada texto tiene buen contraste con su fondo.
const COLOR = {
  // fondos
  pagina: '#CF3438',        // rojo intermedio
  tarjeta: '#B98391',       // rosa malva
  panel: '#A14B63',         // frambuesa
  panelAlterno: '#8F3E55',  // frambuesa más profundo (filas alternadas)
  total: '#B5233B',         // rojo carmesí para el total

  // textos
  texto: '#2B1218',         // sobre la tarjeta rosa malva
  crema: '#FFEDE3',         // sobre la página, los paneles y el total
};

const NIVEL_PROPINA: Record<number, string> = {
  20: 'Excelente',
  15: 'Muy bueno',
  10: 'Bueno',
  5: 'Regular',
  0: 'Malo',
};

// Fondo de color sólido. El degradado de un solo color evita que Gmail y iOS
// reinterpreten el color cuando el celular está en modo oscuro.
function solido(color: string): string {
  return `background:${color};background-image:linear-gradient(${color},${color});`;
}

function dinero(valor: number): string {
  return '$' + valor.toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

// el servidor corre en UTC; se muestra la hora de Argentina
function fechaYHora(valor: Date): string {
  const zona = 'America/Argentina/Buenos_Aires';

  const dia = new Intl.DateTimeFormat('es-AR', {
    timeZone: zona,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(valor);

  const hora = new Intl.DateTimeFormat('es-AR', {
    timeZone: zona,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(valor);

  return `${dia} a las ${hora} horas`;
}

// un dato: etiqueta chica arriba y valor grande abajo (se lee bien en celulares)
function dato(etiqueta: string, valor: string): string {
  return `
    <tr>
      <td style="padding:0 0 16px;font-family:${FUENTE};">
        <p style="margin:0;color:${COLOR.crema};font-size:16px;font-weight:800;letter-spacing:1px;">
          ${escapeHtml(etiqueta)}
        </p>
        <p style="margin:4px 0 0;color:${COLOR.crema};font-size:20px;font-weight:700;line-height:1.4;overflow-wrap:anywhere;">
          ${escapeHtml(valor)}
        </p>
      </td>
    </tr>`;
}

function panel(titulo: string, filas: string): string {
  return `
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      role="presentation"
      bgcolor="${COLOR.panel}"
      style="margin-top:20px;${solido(COLOR.panel)}border-radius:16px;"
    >
      <tr>
        <td style="padding:22px 22px 6px;">
          <p style="margin:0 0 18px;color:${COLOR.crema};font-family:${FUENTE};font-size:22px;font-weight:800;">
            ${escapeHtml(titulo)}
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
            ${filas}
          </table>
        </td>
      </tr>
    </table>`;
}

function filaImporte(etiqueta: string, valor: string): string {
  return `
    <tr>
      <td valign="top" style="padding:7px 12px 7px 0;color:${COLOR.crema};font-family:${FUENTE};font-size:19px;font-weight:700;line-height:1.4;">
        ${escapeHtml(etiqueta)}
      </td>
      <td valign="top" align="right" style="padding:7px 0;color:${COLOR.crema};font-family:${FUENTE};font-size:20px;font-weight:800;white-space:nowrap;">
        ${escapeHtml(valor)}
      </td>
    </tr>`;
}

// En el correo no se usan abreviaturas: la dirección se muestra completa
function direccionCompleta(direccion: string): string {
  return direccion.replace(/\bAv\.\s*/g, 'Avenida ');
}

export function crearEmailFactura(
  datos: DatosFactura,
  nombreArchivo: string,
): string {
  const { subtotal, descuento, propina, total } = calcularImportes(datos);

  const cliente = datos.cliente;
  const nombreCompleto = [cliente.nombre, cliente.apellido].filter(Boolean).join(' ');

  const datosFactura = [
    dato('Restaurante', RESTAURANTE.nombre),
    dato('Dirección', direccionCompleta(RESTAURANTE.direccion)),
    dato('Número de factura', datos.numero),
    dato('Fecha', fechaYHora(datos.fecha)),
    dato('Número de pedido', datos.numeroPedido),
    datos.mesa ? dato('Mesa', `Número ${datos.mesa}`) : '',
  ].join('');

  const datosCliente = [
    dato('Nombre', nombreCompleto),
    cliente.documento ? dato('Documento de identidad', cliente.documento) : '',
    cliente.correo ? dato('Correo electrónico', cliente.correo) : '',
  ].join('');

  const filasDetalle = datos.lineas
    .map((linea, i) => {
      const fondo = i % 2 === 0 ? COLOR.panel : COLOR.panelAlterno;

      return `
        <tr>
          <td bgcolor="${fondo}" style="${solido(fondo)}padding:16px 18px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td valign="top" style="color:${COLOR.crema};font-family:${FUENTE};">
                  <p style="margin:0;font-size:20px;font-weight:800;line-height:1.35;overflow-wrap:anywhere;">
                    ${escapeHtml(linea.nombre)}
                  </p>
                  <p style="margin:6px 0 0;font-size:18px;font-weight:600;line-height:1.5;">
                    Cantidad: ${linea.cantidad}
                  </p>
                  <p style="margin:2px 0 0;font-size:18px;font-weight:600;line-height:1.5;">
                    Precio unitario: ${escapeHtml(dinero(linea.precioUnitario))}
                  </p>
                </td>
                <td valign="top" align="right" style="padding-left:14px;color:${COLOR.crema};font-family:${FUENTE};white-space:nowrap;">
                  <p style="margin:0 0 4px;font-size:16px;font-weight:800;">Importe</p>
                  <p style="margin:0;font-size:22px;font-weight:800;">
                    ${escapeHtml(dinero(linea.precioUnitario * linea.cantidad))}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    })
    .join('');

  const importes = [
    filaImporte('Subtotal', dinero(subtotal)),
    datos.descuentoPorcentaje > 0
      ? filaImporte(
          `Descuento por juegos (${datos.descuentoPorcentaje}%)`,
          `- ${dinero(descuento)}`,
        )
      : '',
    filaImporte(
      `Propina: ${NIVEL_PROPINA[datos.propinaPorcentaje] ?? ''} (${datos.propinaPorcentaje}%)`,
      `+ ${dinero(propina)}`,
    ),
  ].join('');

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
  </style>
  <title>GLUTN - Factura número ${escapeHtml(datos.numero)}</title>

  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800&display=swap" rel="stylesheet">
</head>

<body bgcolor="${COLOR.pagina}" style="margin:0;padding:0;${solido(COLOR.pagina)}font-family:${FUENTE};">

  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    role="presentation"
    bgcolor="${COLOR.pagina}"
    style="${solido(COLOR.pagina)}padding:32px 14px 40px;font-family:${FUENTE};"
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

          <!-- CABECERA -->
          <tr>
            <td align="center" style="padding:0 6px 22px;">
              <img
                src="${LOGO_URL}"
                alt="GLUTN - Especialista en Pastas"
                width="130"
                style="display:block;width:130px;height:auto;border:0;"
              >
              <p style="margin:16px 0 0;color:${COLOR.crema};font-family:${FUENTE};font-size:24px;font-weight:800;">
                Gracias por tu visita
              </p>
            </td>
          </tr>

          <!-- TARJETA PRINCIPAL -->
          <tr>
            <td
              bgcolor="${COLOR.tarjeta}"
              style="${solido(COLOR.tarjeta)}border-radius:22px;padding:34px 26px 30px;"
            >

              <p style="margin:0 0 12px;color:${COLOR.texto};font-family:${FUENTE};font-size:16px;font-weight:800;letter-spacing:2px;">
                PAGO CONFIRMADO
              </p>

              <h1 style="margin:0;color:${COLOR.texto};font-family:${FUENTE};font-size:32px;line-height:1.25;font-weight:800;">
                Hola, ${escapeHtml(nombreCompleto)}
              </h1>

              <p style="margin:18px 0 0;color:${COLOR.texto};font-family:${FUENTE};font-size:19px;line-height:1.7;font-weight:700;">
                Confirmamos el pago de tu pedido. Más abajo podés ver tu
                factura completa. También la adjuntamos a este correo en
                formato PDF para que puedas descargarla o guardarla.
              </p>

              <!-- ARCHIVO ADJUNTO -->
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                role="presentation"
                bgcolor="${COLOR.panel}"
                style="margin-top:24px;${solido(COLOR.panel)}border-radius:14px;border-left:6px solid ${COLOR.crema};"
              >
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 8px;color:${COLOR.crema};font-family:${FUENTE};font-size:16px;font-weight:800;letter-spacing:1px;">
                      ARCHIVO ADJUNTO
                    </p>
                    <p style="margin:0;color:${COLOR.crema};font-family:${FUENTE};font-size:20px;font-weight:800;overflow-wrap:anywhere;">
                      ${escapeHtml(nombreArchivo)}
                    </p>
                    <p style="margin:10px 0 0;color:${COLOR.crema};font-family:${FUENTE};font-size:18px;font-weight:700;line-height:1.6;">
                      Tu factura en formato PDF está adjunta a este correo.
                      Abrila para descargarla o guardarla.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- TU FACTURA -->
              <p style="margin:34px 0 0;color:${COLOR.texto};font-family:${FUENTE};font-size:28px;font-weight:800;">
                Tu factura
              </p>

              ${panel('Datos de la factura', datosFactura)}

              ${panel('Datos del cliente', datosCliente)}

              <!-- DETALLE DE LO CONSUMIDO -->
              <p style="margin:26px 0 12px;color:${COLOR.texto};font-family:${FUENTE};font-size:24px;font-weight:800;">
                Detalle de lo consumido
              </p>

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                role="presentation"
                style="border-radius:16px;overflow:hidden;"
              >
                ${filasDetalle}
              </table>

              ${panel('Resumen de importes', importes)}

              <!-- TOTAL -->
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                role="presentation"
                bgcolor="${COLOR.total}"
                style="margin-top:14px;${solido(COLOR.total)}border-radius:14px;"
              >
                <tr>
                  <td valign="middle" style="padding:20px 14px 20px 18px;color:${COLOR.crema};font-family:${FUENTE};font-size:22px;font-weight:800;">
                    Total a pagar
                  </td>
                  <td valign="middle" align="right" style="padding:20px 18px 20px 0;color:${COLOR.crema};font-family:${FUENTE};font-size:30px;font-weight:800;white-space:nowrap;">
                    ${escapeHtml(dinero(total))}
                  </td>
                </tr>
              </table>

              <p style="margin:28px 0 0;color:${COLOR.texto};font-family:${FUENTE};font-size:16px;font-weight:700;line-height:1.6;">
                Comprobante generado por la aplicación de GLUTN. Pago
                simulado: documento no válido como factura fiscal.
                Este es un mensaje automático: por favor, no respondas
                a este correo.
              </p>

            </td>
          </tr>

          <!-- PIE -->
          <tr>
            <td align="center" style="padding:26px 10px 0;">
              <p style="margin:0;color:${COLOR.crema};font-family:${FUENTE};font-size:24px;font-weight:800;">
                Equipo de GLUTN
              </p>
              <p style="margin:8px 0 0;color:${COLOR.crema};font-family:${FUENTE};font-size:18px;font-weight:800;letter-spacing:2px;">
                ESPECIALISTA EN PASTAS
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