import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';

// datos del restaurante que salen en el encabezado
export const RESTAURANTE = {
  nombre: 'GLUTN - Especialista en Pastas',
  direccion: 'Av. Mitre 750, Avellaneda, Buenos Aires',
};

export interface LineaFactura {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
}

export interface DatosFactura {
  numero: string;
  fecha: Date;
  numeroPedido: string;
  mesa: string | null;
  cliente: {
    nombre: string;
    apellido?: string | null;
    documento?: string | null;
    correo?: string | null;
    anonimo: boolean;
  };
  lineas: LineaFactura[];
  descuentoPorcentaje: number;
  propinaPorcentaje: number;
  // importes ya cobrados (los del ticket); si vienen, se respetan en lugar de recalcularlos
  importesCobrados?: { descuento: number; propina: number };
}

const NIVEL_PROPINA: Record<number, string> = {
  20: 'Excelente',
  15: 'Muy bueno',
  10: 'Bueno',
  5: 'Regular',
  0: 'Malo',
};

const VERDE = rgb(0x65 / 255, 0x7a / 255, 0x4d / 255);
const VERDE_CLARO = rgb(0xf1 / 255, 0xf4 / 255, 0xec / 255);
const MARRON = rgb(0x5b / 255, 0x3a / 255, 0x29 / 255);
const NARANJA = rgb(0xe8 / 255, 0x70 / 255, 0x4a / 255);
const TEXTO = rgb(0.13, 0.13, 0.13);
const GRIS = rgb(0.4, 0.4, 0.4);
const BLANCO = rgb(1, 1, 1);

const ANCHO = 595.28;
const ALTO = 841.89;
const MARGEN = 40;

// el descuento y la propina se calculan sobre el subtotal
export function calcularImportes(datos: DatosFactura) {
  const subtotal = datos.lineas.reduce((suma, l) => suma + l.precioUnitario * l.cantidad, 0);
  const descuento = datos.importesCobrados?.descuento ?? Math.round((subtotal * datos.descuentoPorcentaje) / 100);
  const propina = datos.importesCobrados?.propina ?? Math.round(((subtotal) * datos.propinaPorcentaje) / 100);

  return { subtotal, descuento, propina, total: subtotal - descuento + propina };
}

function dinero(valor: number): string {
  return '$' + valor.toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

// el servidor corre en UTC; la fecha se muestra con la hora de Argentina
function fecha(valor: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(valor)
    .replace(',', '');
}

// parte el texto en renglones para que nada quede cortado
function renglones(texto: string, fuente: PDFFont, tamano: number, ancho: number): string[] {
  const resultado: string[] = [];
  let actual = '';

  for (const palabra of texto.split(/\s+/)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;

    if (fuente.widthOfTextAtSize(prueba, tamano) <= ancho || !actual) {
      actual = prueba;
    } else {
      resultado.push(actual);
      actual = palabra;
    }
  }

  if (actual) {
    resultado.push(actual);
  }

  return resultado;
}

// como renglones, pero también parte lo que no tiene espacios (un correo largo):
// primero después de la @ y, si igual no entra, letra por letra
function renglonesLargos(texto: string, fuente: PDFFont, tamano: number, ancho: number): string[] {
  const entra = (parte: string) => fuente.widthOfTextAtSize(parte, tamano) <= ancho;
  const resultado: string[] = [];

  for (const renglon of renglones(texto, fuente, tamano, ancho)) {
    if (entra(renglon)) {
      resultado.push(renglon);
      continue;
    }

    const arroba = renglon.indexOf('@');
    const partes = arroba > 0 ? [renglon.slice(0, arroba + 1), renglon.slice(arroba + 1)] : [renglon];

    for (const parte of partes) {
      let actual = '';

      for (const letra of parte) {
        if (actual && !entra(actual + letra)) {
          // si se puede, corta después de un punto para no partir una palabra
          const punto = actual.lastIndexOf('.');

          if (punto > 0) {
            resultado.push(actual.slice(0, punto + 1));
            actual = actual.slice(punto + 1);
          } else {
            resultado.push(actual);
            actual = '';
          }
        }
        actual += letra;
      }

      if (actual) {
        resultado.push(actual);
      }
    }
  }

  return resultado;
}

// arma "a - b - c" en renglones; cuando corta, el guion queda al final del renglón
function renglonesDePedidos(numeros: string[], fuente: PDFFont, tamano: number, ancho: number): string[] {
  const resultado: string[] = [];
  let actual = '';

  for (const numero of numeros) {
    const prueba = actual ? `${actual} - ${numero}` : numero;

    if (fuente.widthOfTextAtSize(prueba, tamano) <= ancho || !actual) {
      actual = prueba;
    } else {
      resultado.push(`${actual} -`);
      actual = numero;
    }
  }

  if (actual) {
    resultado.push(actual);
  }

  return resultado;
}

function aLaDerecha(pagina: PDFPage, texto: string, x: number, y: number, fuente: PDFFont, tamano: number, color = TEXTO) {
  pagina.drawText(texto, { x: x - fuente.widthOfTextAtSize(texto, tamano), y, size: tamano, font: fuente, color });
}

// arma el PDF en memoria; no guarda nada
export async function generarFacturaPdf(datos: DatosFactura, logoPng?: Uint8Array): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Factura ${datos.numero} - GLUTN`);
  pdf.setAuthor(RESTAURANTE.nombre);

  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = logoPng ? await pdf.embedPng(logoPng) : null;

  let pagina = pdf.addPage([ANCHO, ALTO]);

  // encabezado verde con el logo y los datos de la factura
  pagina.drawRectangle({ x: 0, y: ALTO - 150, width: ANCHO, height: 150, color: VERDE });

  if (logo) {
    const escala = 110 / logo.height;
    pagina.drawImage(logo, { x: MARGEN - 10, y: ALTO - 135, width: logo.width * escala, height: 110 });
  }

  aLaDerecha(pagina, 'FACTURA', ANCHO - MARGEN, ALTO - 62, negrita, 28, BLANCO);
  aLaDerecha(pagina, `Número ${datos.numero}`, ANCHO - MARGEN, ALTO - 86, normal, 12, BLANCO);
  aLaDerecha(pagina, `Fecha ${fecha(datos.fecha)}`, ANCHO - MARGEN, ALTO - 104, normal, 12, BLANCO);

  let y = ALTO - 182;
  pagina.drawText(RESTAURANTE.nombre, { x: MARGEN, y, size: 14, font: negrita, color: MARRON });
  y -= 17;
  pagina.drawText(RESTAURANTE.direccion, { x: MARGEN, y, size: 10.5, font: normal, color: GRIS });

  // datos del cliente y del pedido en dos cajas
  y -= 22;
  const anchoCaja = (ANCHO - MARGEN * 2 - 14) / 2;
  const anchoValor = anchoCaja - 80;
  const cliente = datos.cliente;
  const nombreCompleto = [cliente.nombre, cliente.apellido].filter(Boolean).join(' ');

  // si la cuenta juntó varios pedidos, van todos: pedido a - pedido b - pedido c
  const variosPedidos = datos.numeroPedido.includes(' - ');

  const cajas: [string, [string, string[]][]][] = [
    [
      'Datos del cliente',
      (cliente.anonimo
        ? [['Nombre', nombreCompleto], ['Tipo', 'Cliente anónimo']]
        : [['Nombre', nombreCompleto], ['DNI', cliente.documento ?? '-'], ['Correo', cliente.correo ?? '-']]
      ).map(([etiqueta, valor]) => [etiqueta, renglonesLargos(valor, normal, 10, anchoValor)] as [string, string[]]),
    ],
    [
      'Datos del pedido',
      [
        variosPedidos
          ? ['Pedidos', renglonesDePedidos(datos.numeroPedido.split(' - '), normal, 10, anchoValor)]
          : ['Pedido', [`Número ${datos.numeroPedido}`]],
        ['Mesa', [datos.mesa ?? '-']],
      ],
    ],
  ];

  // la caja crece si los pedidos ocupan más de un renglón
  const renglonesPorCaja = cajas.map(([, filas]) => filas.reduce((suma, [, valor]) => suma + valor.length, 0));
  const altoCaja = Math.max(92, 58 + (Math.max(...renglonesPorCaja) - 1) * 17);

  cajas.forEach(([titulo, filas], i) => {
    const x = MARGEN + i * (anchoCaja + 14);
    pagina.drawRectangle({ x, y: y - altoCaja, width: anchoCaja, height: altoCaja, color: VERDE_CLARO, borderColor: VERDE, borderWidth: 1 });
    pagina.drawText(titulo, { x: x + 12, y: y - 20, size: 11, font: negrita, color: VERDE });

    let fila = y - 40;
    filas.forEach(([etiqueta, valor]) => {
      pagina.drawText(`${etiqueta}:`, { x: x + 12, y: fila, size: 10, font: negrita, color: TEXTO });
      valor.forEach((texto) => {
        pagina.drawText(texto, { x: x + 64, y: fila, size: 10, font: normal, color: TEXTO });
        fila -= 17;
      });
    });
  });

  y -= altoCaja + 28;

  // detalle de lo consumido
  const columnas = { producto: MARGEN + 10, cantidad: 330, unitario: 440, importe: ANCHO - MARGEN - 10 };
  const anchoProducto = 330 - 30 - columnas.producto;

  const cabecera = () => {
    pagina.drawRectangle({ x: MARGEN, y: y - 8, width: ANCHO - MARGEN * 2, height: 26, color: MARRON });
    pagina.drawText('Producto', { x: columnas.producto, y, size: 10.5, font: negrita, color: BLANCO });
    aLaDerecha(pagina, 'Cantidad', columnas.cantidad, y, negrita, 10.5, BLANCO);
    aLaDerecha(pagina, 'Precio unitario', columnas.unitario, y, negrita, 10.5, BLANCO);
    aLaDerecha(pagina, 'Importe', columnas.importe, y, negrita, 10.5, BLANCO);
    y -= 30;
  };

  cabecera();

  datos.lineas.forEach((linea, i) => {
    const partes = renglones(linea.nombre, normal, 10.5, anchoProducto);
    const altoFila = 10 + partes.length * 14;

    // si no entra, sigue en otra hoja
    if (y - altoFila < 230) {
      pagina = pdf.addPage([ANCHO, ALTO]);
      y = ALTO - MARGEN - 10;
      cabecera();
    }

    if (i % 2 === 0) {
      pagina.drawRectangle({ x: MARGEN, y: y - altoFila + 14, width: ANCHO - MARGEN * 2, height: altoFila, color: VERDE_CLARO });
    }

    partes.forEach((parte, j) => {
      pagina.drawText(parte, { x: columnas.producto, y: y - j * 14, size: 10.5, font: normal, color: TEXTO });
    });
    aLaDerecha(pagina, String(linea.cantidad), columnas.cantidad, y, normal, 10.5);
    aLaDerecha(pagina, dinero(linea.precioUnitario), columnas.unitario, y, normal, 10.5);
    aLaDerecha(pagina, dinero(linea.precioUnitario * linea.cantidad), columnas.importe, y, negrita, 10.5);

    y -= altoFila;
  });

  // totales
  const { subtotal, descuento, propina, total } = calcularImportes(datos);
  const xEtiqueta = 300;
  y -= 14;

  const filaTotal = (etiqueta: string, valor: string, color = TEXTO) => {
    pagina.drawText(etiqueta, { x: xEtiqueta, y, size: 11, font: normal, color });
    aLaDerecha(pagina, valor, columnas.importe, y, negrita, 11, color);
    y -= 20;
  };

  filaTotal('Subtotal', dinero(subtotal));

  if (datos.descuentoPorcentaje > 0) {
    filaTotal(`Descuento por juegos (${datos.descuentoPorcentaje}%)`, `- ${dinero(descuento)}`, VERDE);
  }

  const nivel = NIVEL_PROPINA[datos.propinaPorcentaje] ?? '';
  filaTotal(`Propina: ${nivel} (${datos.propinaPorcentaje}%)`, `+ ${dinero(propina)}`);

  y -= 22;
  pagina.drawRectangle({ x: xEtiqueta - 14, y: y - 22, width: columnas.importe + 10 - (xEtiqueta - 14), height: 46, color: NARANJA });
  pagina.drawText('TOTAL', { x: xEtiqueta, y: y - 6, size: 16, font: negrita, color: BLANCO });
  aLaDerecha(pagina, dinero(total), columnas.importe, y - 8, negrita, 22, BLANCO);

  // pie de página
  pagina.drawLine({ start: { x: MARGEN, y: 78 }, end: { x: ANCHO - MARGEN, y: 78 }, thickness: 1, color: VERDE });
  const gracias = '¡Gracias por tu visita! Esperamos verte pronto.';
  pagina.drawText(gracias, { x: (ANCHO - negrita.widthOfTextAtSize(gracias, 12)) / 2, y: 58, size: 12, font: negrita, color: MARRON });
  const aviso = 'Comprobante generado por la aplicación GLUTN. Pago simulado: documento no válido como factura fiscal.';
  pagina.drawText(aviso, { x: (ANCHO - normal.widthOfTextAtSize(aviso, 8.5)) / 2, y: 40, size: 8.5, font: normal, color: GRIS });

  return await pdf.save();
}
