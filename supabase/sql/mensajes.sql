-- Sala de conversación entre mozos y clientes (punto 11: consulta al mozo).
-- Se ejecuta una sola vez en Supabase > SQL Editor.
--
-- Es UNA sola sala: todos los mozos y todos los clientes leen los mismos
-- mensajes. Por eso no hay un id de conversación.

create table if not exists public.mensajes (
  id uuid primary key default gen_random_uuid(),
  id_autor uuid not null references auth.users (id) on delete cascade,
  nombre text not null,
  perfil text not null,
  numero_mesa text,
  texto text not null check (char_length(btrim(texto)) between 1 and 500),
  en_respuesta_a uuid references public.mensajes (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists mensajes_created_at_idx
  on public.mensajes (created_at desc);

-- El nombre, el perfil y el autor NO los manda la app: los completa la base
-- a partir de la sesión y de la tabla usuarios. Así nadie puede escribir
-- haciéndose pasar por otra persona ni por un mozo.
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
begin
  new.id_autor := auth.uid();

  if new.id_autor is null then
    raise exception 'Sesión inválida.';
  end if;

  select u.nombre, u.apellido, u.perfil
    into v_nombre, v_apellido, v_perfil
    from public.usuarios u
   where u.id = new.id_autor;

  -- Un usuario sin fila en usuarios solo puede ser un cliente anónimo,
  -- nunca un mozo.
  new.perfil := coalesce(v_perfil, 'cliente_anonimo');

  new.nombre := coalesce(
    nullif(btrim(coalesce(v_nombre, '') || ' ' || coalesce(v_apellido, '')), ''),
    'Cliente'
  );

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

drop trigger if exists mensajes_completar_trg on public.mensajes;

create trigger mensajes_completar_trg
  before insert on public.mensajes
  for each row execute function public.mensajes_completar();

-- Seguridad: cualquier usuario logueado lee la sala, y solo puede escribir
-- como sí mismo. No hay políticas de update ni de delete: los mensajes no
-- se editan ni se borran.
alter table public.mensajes enable row level security;

drop policy if exists mensajes_leer on public.mensajes;
create policy mensajes_leer
  on public.mensajes
  for select
  to authenticated
  using (true);

drop policy if exists mensajes_escribir on public.mensajes;
create policy mensajes_escribir
  on public.mensajes
  for insert
  to authenticated
  with check (id_autor = (select auth.uid()));

-- Realtime: para que los mensajes nuevos lleguen en vivo.
alter publication supabase_realtime add table public.mensajes;
