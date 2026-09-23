-- Incremental sobre mensajes.sql (punto 11): agrega el avatar del autor a
-- cada mensaje, para poder mostrarlo en el chat. Se ejecuta una sola vez,
-- DESPUÉS de mensajes.sql, en Supabase > SQL Editor.

alter table public.mensajes
  add column if not exists foto text;

-- Mismo trigger de mensajes.sql, con el agregado de copiar el avatar.
create or replace function public.mensajes_completar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
  v_apellido text;
  v_perfil text;
  v_avatar text;
begin
  new.id_autor := auth.uid();

  if new.id_autor is null then
    raise exception 'Sesión inválida.';
  end if;

  select u.nombre, u.apellido, u.perfil, u.avatar
    into v_nombre, v_apellido, v_perfil, v_avatar
    from public.usuarios u
   where u.id = new.id_autor;

  -- Un usuario sin fila en usuarios solo puede ser un cliente anónimo,
  -- nunca un mozo.
  new.perfil := coalesce(v_perfil, 'cliente_anonimo');

  new.nombre := coalesce(
    nullif(btrim(coalesce(v_nombre, '') || ' ' || coalesce(v_apellido, '')), ''),
    'Cliente'
  );

  new.foto := v_avatar;

  if new.perfil not in ('mozo', 'cliente_registrado', 'cliente_anonimo') then
    raise exception 'Tu perfil no puede usar el chat.';
  end if;

  new.texto := btrim(new.texto);

  -- Los mozos no tienen mesa.
  if new.perfil = 'mozo' then
    new.numero_mesa := null;
  end if;

  return new;
end;
$$;
