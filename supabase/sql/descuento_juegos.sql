-- descuento de los juegos, uno por estadía

create table if not exists public.descuento_juegos (
  id uuid primary key default gen_random_uuid(),
  id_usuario uuid not null references auth.users (id) on delete cascade,
  id_estadia uuid not null unique references public.lista_espera (id) on delete cascade,
  juego text not null check (juego in ('ruleta', 'ta-te-ti', 'sopa-de-letras')),
  porcentaje integer not null default 0 check (porcentaje in (0, 10, 15, 20)),
  terminado boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.descuento_juegos enable row level security;

-- cada cliente ve lo suyo, el personal ve todo
drop policy if exists descuento_juegos_select on public.descuento_juegos;
create policy descuento_juegos_select on public.descuento_juegos
  for select to authenticated
  using (
    id_usuario = auth.uid()
    or exists (
      select 1 from public.usuarios u
       where u.id = auth.uid()
         and u.perfil in ('dueno', 'supervisor', 'metre', 'mozo')
    )
  );

-- estadía actual del cliente
create or replace function public.juego_estadia_actual()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select le.id
    from public.lista_espera le
   where le.usuario_id = auth.uid()
     and le.estado = 'en_mesa'
   order by le.created_at desc
   limit 1;
$$;

-- descuento actual: null no jugó, 0 sin descuento, mayor a 0 ganado
create or replace function public.juego_descuento_actual()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select dj.porcentaje
    from public.descuento_juegos dj
   where dj.id_estadia = public.juego_estadia_actual();
$$;

-- empieza el primer intento
create or replace function public.juego_iniciar(p_juego text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estadia uuid := public.juego_estadia_actual();
begin
  if v_estadia is null then
    return false;
  end if;

  insert into public.descuento_juegos (id_usuario, id_estadia, juego)
  values (auth.uid(), v_estadia, p_juego)
  on conflict (id_estadia) do nothing;

  return found;
end;
$$;

-- termina el primer intento y la base decide el porcentaje
create or replace function public.juego_terminar(p_gano boolean)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil text;
  v_porcentaje integer;
begin
  select u.perfil into v_perfil
    from public.usuarios u
   where u.id = auth.uid();

  update public.descuento_juegos dj
     set terminado = true,
         porcentaje = case
           when p_gano and v_perfil = 'cliente_registrado' then
             case dj.juego
               when 'ruleta' then 20
               when 'ta-te-ti' then 15
               when 'sopa-de-letras' then 10
             end
           else 0
         end
   where dj.id_estadia = public.juego_estadia_actual()
     and dj.terminado = false
  returning dj.porcentaje into v_porcentaje;

  return v_porcentaje;
end;
$$;

-- resultado neutro, libera el intento
create or replace function public.juego_anular()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.descuento_juegos dj
   where dj.id_estadia = public.juego_estadia_actual()
     and dj.terminado = false;
$$;

revoke execute on function public.juego_estadia_actual() from public, anon;
revoke execute on function public.juego_descuento_actual() from public, anon;
revoke execute on function public.juego_iniciar(text) from public, anon;
revoke execute on function public.juego_terminar(boolean) from public, anon;
revoke execute on function public.juego_anular() from public, anon;

grant execute on function public.juego_descuento_actual() to authenticated;
grant execute on function public.juego_iniciar(text) to authenticated;
grant execute on function public.juego_terminar(boolean) to authenticated;
grant execute on function public.juego_anular() to authenticated;

notify pgrst, 'reload schema';
