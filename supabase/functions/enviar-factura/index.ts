import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

import {
  crearClienteAdmin,
  obtenerUsuarioAutenticado,
} from '../_shared/supabase.ts';

import { enviarNotificacionFirebase } from '../_shared/firebase.ts';
import { enviarGmail } from '../_shared/gmail.ts';

import {
  generarFacturaPdf,
  type DatosFactura,
} from '../_shared/factura-pdf.ts';

import {
  armarFactura,
  type FacturaArmada,
} from '../_shared/factura-datos.ts';

import { crearEmailFactura } from '../_shared/email-factura.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const LOGO_URL =
  'https://tjdzkzopfhsharkgwvjh.supabase.co/storage/v1/object/public/images/logo/LOGO-GLUTN.png';

// bucket privado donde se guarda la factura de los clientes anónimos
const BUCKET_FACTURAS = 'facturas';

// el enlace de descarga dura 30 días
const VIGENCIA_ENLACE_EN_SEGUNDOS = 60 * 60 * 24 * 30;

function mensajeDeError(razon: unknown): string {
  return razon instanceof Error ? razon.message : 'Error desconocido.';
}

function dinero(valor: number): string {
  return '$' + valor.toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

// si el logo no se puede leer, la factura sale igual sin logo
async function leerLogo(): Promise<Uint8Array | undefined> {
  try {
    const respuesta = await fetch(LOGO_URL);

    if (!respuesta.ok) return undefined;

    return new Uint8Array(await respuesta.arrayBuffer());
  } catch {
    return undefined;
  }
}

async function crearPdf(datos: DatosFactura): Promise<Uint8Array> {
  const logo = await leerLogo();

  try {
    return await generarFacturaPdf(datos, logo);
  } catch (error) {
    console.error('No se pudo incluir el logo en el PDF:', error);
    return await generarFacturaPdf(datos);
  }
}

// envía la misma notificación a todos los dispositivos activos de esos usuarios
async function enviarPush(
  admin: SupabaseClient,
  usuarioIds: string[],
  titulo: string,
  cuerpo: string,
  datos: Record<string, string>,
) {
  if (usuarioIds.length === 0) {
    return { dispositivos: 0, enviados: 0, errores: 0 };
  }

  const { data: dispositivos, error } = await admin
    .from('dispositivos_push')
    .select('id, token')
    .in('usuario_id', usuarioIds)
    .eq('activo', true);

  if (error) throw new Error('No se pudieron obtener los dispositivos.');

  const lista = dispositivos ?? [];

  const resultados = await Promise.allSettled(
    lista.map((dispositivo) =>
      enviarNotificacionFirebase(dispositivo.token, titulo, cuerpo, datos)
    ),
  );

  let enviados = 0;
  let errores = 0;

  resultados.forEach((resultado, i) => {
    if (resultado.status === 'fulfilled') {
      enviados++;
    } else {
      errores++;
      console.error(`Error enviando al dispositivo ${lista[i].id}:`, resultado.reason);
    }
  });

  return { dispositivos: lista.length, enviados, errores };
}

// notificación al dueño y a los supervisores
async function avisarAGestores(
  admin: SupabaseClient,
  factura: FacturaArmada,
  nombreMozo: string,
) {
  const { data: gestores, error } = await admin
    .from('usuarios')
    .select('id')
    .in('perfil', ['dueno', 'supervisor']);

  if (error) throw new Error('No se pudieron obtener el dueño y los supervisores.');

  const detalleMesa = factura.numeroMesa
    ? `de la mesa número ${factura.numeroMesa}`
    : 'de un pedido';

  const cuerpo =
    `${nombreMozo} confirmó el pago ${detalleMesa}. ` +
    `Total cobrado: ${dinero(factura.totalCobrado)}.`;

  return await enviarPush(
    admin,
    (gestores ?? []).map((g) => g.id),
    'Pago confirmado',
    cuerpo,
    { tipo: 'pago_confirmado', idPedido: factura.idPedido },
  );
}

// cliente registrado: correo con el PDF adjunto y la factura a la vista
// cliente anónimo: notificación con el enlace para descargar el PDF
async function entregarAlCliente(
  admin: SupabaseClient,
  factura: FacturaArmada,
  pdf: Uint8Array,
  nombreArchivo: string,
) {
  if (factura.datos.cliente.anonimo) {
    const ruta = `${factura.idTicket}.pdf`;

    const { error: errorSubida } = await admin.storage
      .from(BUCKET_FACTURAS)
      .upload(ruta, pdf, { contentType: 'application/pdf', upsert: true });

    if (errorSubida) {
      throw new Error(`No se pudo guardar la factura: ${errorSubida.message}`);
    }

    const { data: enlace, error: errorEnlace } = await admin.storage
      .from(BUCKET_FACTURAS)
      .createSignedUrl(ruta, VIGENCIA_ENLACE_EN_SEGUNDOS, { download: nombreArchivo });

    if (errorEnlace || !enlace?.signedUrl) {
      throw new Error('No se pudo crear el enlace de descarga.');
    }

    const push = await enviarPush(
      admin,
      [factura.idUsuario],
      'Tu factura está lista',
      'Gracias por visitarnos. Tocá esta notificación para descargar la factura de tu pedido en formato PDF.',
      {
        tipo: 'factura_lista',
        idPedido: factura.idPedido,
        url: enlace.signedUrl,
      },
    );

    return { via: 'notificacion', ...push };
  }

  if (!factura.correo) {
    throw new Error('El cliente no tiene un correo electrónico registrado.');
  }

  await enviarGmail(
    factura.correo,
    `Tu factura de GLUTN, número ${factura.numeroFactura}`,
    crearEmailFactura(factura.datos, nombreArchivo),
    [
      {
        nombreArchivo,
        tipoMime: 'application/pdf',
        contenido: pdf,
      },
    ],
  );

  return { via: 'correo', destinatario: factura.correo };
}

// Se llama desde la app del mozo cuando confirma el pago.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization) throw new Error('Falta la autorización.');

    const usuario = await obtenerUsuarioAutenticado(authorization);

    const { idPedido } = await req.json();
    if (!idPedido) throw new Error('Falta idPedido.');

    const admin = crearClienteAdmin();

    // solo un mozo puede disparar el envío (es quien confirma los pagos)
    const { data: mozo } = await admin
      .from('usuarios')
      .select('perfil, nombre, apellido')
      .eq('id', usuario.id)
      .maybeSingle();

    if (mozo?.perfil !== 'mozo') {
      throw new Error('Solo un mozo puede enviar la factura.');
    }

    const nombreMozo = `El mozo ${[mozo.nombre, mozo.apellido].filter(Boolean).join(' ')}`.trim();

    const factura = await armarFactura(admin, idPedido);
    const nombreArchivo = `factura-glutn-${factura.idTicket.slice(0, 8)}.pdf`;
    const pdf = await crearPdf(factura.datos);

    // las dos tareas son independientes: si una falla, la otra se hace igual
    const [gestores, cliente] = await Promise.allSettled([
      avisarAGestores(admin, factura, nombreMozo),
      entregarAlCliente(admin, factura, pdf, nombreArchivo),
    ]);

    if (gestores.status === 'rejected') {
      console.error('Error avisando al dueño y a los supervisores:', gestores.reason);
    }

    if (cliente.status === 'rejected') {
      console.error('Error enviando la factura al cliente:', cliente.reason);
    }

    return json({
      ok: true,
      gestores:
        gestores.status === 'fulfilled'
          ? gestores.value
          : { error: mensajeDeError(gestores.reason) },
      cliente:
        cliente.status === 'fulfilled'
          ? cliente.value
          : { error: mensajeDeError(cliente.reason) },
    });
  } catch (error) {
    console.error('Error en enviar-factura:', error);

    return json({ ok: false, error: mensajeDeError(error) }, 400);
  }
});