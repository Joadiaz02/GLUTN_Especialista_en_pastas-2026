-- Punto 23: ingreso con Google y Discord
-- Correr en Supabase → SQL Editor, en este orden.

-- =========================================================
-- PASO 1 (solo lectura): ver qué trigger crea la fila en usuarios
-- =========================================================
-- Un usuario nuevo de Google o Discord llega SIN perfil, documento ni
-- apellido en la metadata. Si el trigger falla con eso, el login tira
-- "Database error saving new user".

select
  t.tgname as trigger,
  p.proname as funcion,
  pg_get_functiondef(p.oid) as definicion
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
where t.tgrelid = 'auth.users'::regclass
  and not t.tgisinternal;

-- columnas obligatorias de usuarios (si perfil/documento son NOT NULL
-- y el trigger inserta siempre, hay que ajustarlo)
select column_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'usuarios'
order by ordinal_position;


-- =========================================================
-- PASO 2: completar el registro de un cliente que entró con una red
-- =========================================================
-- Fuerza el perfil a cliente_registrado (el cliente no puede elegirlo)
-- y lo deja pendiente de aprobación, igual que el registro con correo.

create or replace function public.completar_registro_social(
  p_nombre text,
  p_apellido text,
  p_documento text,
  p_avatar text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Tenés que iniciar sesión.';
  end if;

  -- solo para usuarios que todavía no tienen perfil
  if exists (
    select 1 from auth.users
    where id = auth.uid()
      and coalesce(raw_user_meta_data ->> 'perfil', '') <> ''
  ) then
    raise exception 'El usuario ya tiene perfil.';
  end if;

  if coalesce(trim(p_nombre), '') = ''
     or coalesce(trim(p_apellido), '') = ''
     or p_documento !~ '^\d{8}$' then
    raise exception 'Datos incompletos.';
  end if;

  update auth.users
     set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
       || jsonb_build_object(
            'perfil', 'cliente_registrado',
            'nombre', trim(p_nombre),
            'apellido', trim(p_apellido),
            'documento', p_documento,
            'avatar', p_avatar
          )
   where id = auth.uid();

  insert into public.usuarios
    (id, nombre, apellido, documento, perfil, avatar, estado_aprobacion)
  values
    (auth.uid(), trim(p_nombre), trim(p_apellido), p_documento,
     'cliente_registrado', p_avatar, 'pendiente')
  on conflict (id) do update
     set nombre = excluded.nombre,
         apellido = excluded.apellido,
         documento = excluded.documento,
         perfil = excluded.perfil,
         avatar = excluded.avatar,
         estado_aprobacion = 'pendiente';
end;
$$;

revoke all on function public.completar_registro_social(text, text, text, text) from public, anon;
grant execute on function public.completar_registro_social(text, text, text, text) to authenticated;


-- =========================================================
-- PASO 3: cambiar la foto de perfil desde "Mi cuenta"
-- =========================================================
-- Cada usuario solo puede cambiar SU foto. Actualiza la metadata de la
-- cuenta (lo que lee la app) y public.usuarios (chat, listados, espera).

create or replace function public.actualizar_avatar(p_avatar text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Tenés que iniciar sesión.';
  end if;

  if coalesce(trim(p_avatar), '') = '' then
    raise exception 'Falta la foto.';
  end if;

  update auth.users
     set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
       || jsonb_build_object('avatar', p_avatar)
   where id = auth.uid();

  update public.usuarios
     set avatar = p_avatar
   where id = auth.uid();
end;
$$;

revoke all on function public.actualizar_avatar(text) from public, anon;
grant execute on function public.actualizar_avatar(text) to authenticated;


-- =========================================================
-- PASO 4 (solo lectura, para la revisión): quién tiene qué red vinculada
-- =========================================================
select u.email, u.raw_user_meta_data ->> 'perfil' as perfil, i.provider, i.created_at
from auth.identities i
join auth.users u on u.id = i.user_id
where i.provider in ('google', 'discord')
order by u.email, i.provider;
