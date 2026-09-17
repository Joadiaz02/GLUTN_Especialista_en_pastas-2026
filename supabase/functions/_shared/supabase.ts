import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

function obtenerVariablesSupabase() {
  const url = Deno.env.get('SUPABASE_URL');
  const publishableKeysRaw = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  const secretKeysRaw = Deno.env.get('SUPABASE_SECRET_KEYS');

  if (
    !url ||
    !publishableKeysRaw ||
    !secretKeysRaw
  ) {
    throw new Error(
      'Faltan variables de entorno de Supabase.'
    );
  }

  const publishableKeys = JSON.parse(
    publishableKeysRaw
  );

  const secretKeys = JSON.parse(
    secretKeysRaw
  );

  return {
    url,
    publishableKey:
      publishableKeys['default'],
    secretKey:
      secretKeys['default'],
  };
}

export function crearClienteUsuario(
  authorization: string
): SupabaseClient {

  const {
    url,
    publishableKey,
  } = obtenerVariablesSupabase();

  return createClient(
    url,
    publishableKey,
    {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
    }
  );
}

export function crearClienteAdmin(): SupabaseClient {

  const {
    url,
    secretKey,
  } = obtenerVariablesSupabase();

  return createClient(
    url,
    secretKey
  );
}

export async function obtenerUsuarioAutenticado(
  authorization: string
) {

  const supabase =
    crearClienteUsuario(
      authorization
    );

  const {
    data: {
      user,
    },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error(
      'Sesión inválida.'
    );
  }

  return user;
}

export async function verificarGestor(
  supabaseAdmin: SupabaseClient,
  usuarioId: string
): Promise<void> {

  const {
    data,
    error,
  } = await supabaseAdmin
    .from('usuarios')
    .select('id, perfil')
    .eq('id', usuarioId)
    .maybeSingle();

  if (error) {
    throw new Error(
      'No se pudo verificar el perfil del usuario.'
    );
  }

  if (
    !data ||
    ![
      'dueno',
      'supervisor',
    ].includes(data.perfil)
  ) {
    throw new Error(
      'No tenés permisos para realizar esta acción.'
    );
  }
}