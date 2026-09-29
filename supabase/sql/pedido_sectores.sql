-- Estado de cada sector (cocina y bar) dentro de un pedido.
-- Puntos 16 y 18: la cocina y el bar reciben su parte del pedido y avisan
-- cuando la terminan. El pedido recién está "listo" cuando terminaron
-- todos los sectores que tienen algo para preparar.
-- Se ejecuta en Supabase > SQL Editor (se puede volver a correr).
--
-- null             = el sector todavía no lo recibió (o no tiene nada que preparar)
-- 'en_preparacion' = el sector lo recibió y lo está preparando
-- 'listo'          = el sector terminó su parte

alter table public.pedido
  add column if not exists estado_cocina text
    check (estado_cocina in ('en_preparacion', 'listo'));

alter table public.pedido
  add column if not exists estado_bar text
    check (estado_bar in ('en_preparacion', 'listo'));

-- Solo el cocinero maneja la cocina y solo el cantinero maneja el bar.
create or replace function public.pedido_validar_sector(p_sector text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil text;
begin
  if p_sector not in ('cocina', 'bar') then
    raise exception 'Sector inválido.';
  end if;

  select u.perfil into v_perfil
    from public.usuarios u
   where u.id = auth.uid();

  if (p_sector = 'cocina' and v_perfil is distinct from 'cocinero')
     or (p_sector = 'bar' and v_perfil is distinct from 'cantinero') then
    raise exception 'Tu perfil no puede manejar este sector.';
  end if;
end;
$$;

-- Punto 16: el sector recibe su parte. El pedido pasa a 'en_preparacion'.
-- Devuelve false si otro empleado del sector ya lo había recibido.
create or replace function public.pedido_sector_recibir(p_id_pedido uuid, p_sector text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_filas integer;
begin
  perform public.pedido_validar_sector(p_sector);

  if p_sector = 'cocina' then
    update public.pedido
       set estado_cocina = 'en_preparacion',
           estado_pedido = 'en_preparacion'
     where id_pedido = p_id_pedido
       and estado_cocina is null
       and estado_pedido in ('confirmado', 'en_preparacion');
  else
    update public.pedido
       set estado_bar = 'en_preparacion',
           estado_pedido = 'en_preparacion'
     where id_pedido = p_id_pedido
       and estado_bar is null
       and estado_pedido in ('confirmado', 'en_preparacion');
  end if;

  get diagnostics v_filas = row_count;

  return v_filas > 0;
end;
$$;

-- Punto 18: el sector terminó su parte. Si ya terminaron todos los
-- sectores que tienen ítems en el pedido, el pedido pasa a 'listo'.
-- El "for update" evita que cocina y bar terminen a la vez y ninguno de
-- los dos vea al otro terminado. Devuelve el estado final del pedido.
create or replace function public.pedido_sector_listo(p_id_pedido uuid, p_sector text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cocina text;
  v_bar text;
  v_tiene_cocina boolean;
  v_tiene_bar boolean;
  v_estado text;
begin
  perform public.pedido_validar_sector(p_sector);

  select p.estado_cocina, p.estado_bar
    into v_cocina, v_bar
    from public.pedido p
   where p.id_pedido = p_id_pedido
     for update;

  if not found then
    raise exception 'El pedido no existe.';
  end if;

  if p_sector = 'cocina' then
    if v_cocina is distinct from 'en_preparacion' then
      raise exception 'La cocina no tiene este pedido en preparación.';
    end if;
    v_cocina := 'listo';
  else
    if v_bar is distinct from 'en_preparacion' then
      raise exception 'El bar no tiene este pedido en preparación.';
    end if;
    v_bar := 'listo';
  end if;

  select coalesce(bool_or(c.tipo in ('plato', 'postre')), false),
         coalesce(bool_or(c.tipo = 'bebida'), false)
    into v_tiene_cocina, v_tiene_bar
    from public.pedido_item i
    join public.carta c on c.id_carta = i.id_carta
   where i.id_pedido = p_id_pedido;

  update public.pedido
     set estado_cocina = v_cocina,
         estado_bar = v_bar,
         estado_pedido = case
           when (not v_tiene_cocina or v_cocina = 'listo')
            and (not v_tiene_bar or v_bar = 'listo')
           then 'listo'
           else estado_pedido
         end
   where id_pedido = p_id_pedido
  returning estado_pedido into v_estado;

  return v_estado;
end;
$$;

-- El sector no puede preparar el pedido (ej. falta un ingrediente): el
-- pedido vuelve al cliente como 'rechazado', igual que cuando lo rechaza
-- el mozo, para que lo modifique y lo reenvíe. Solo antes de recibirlo.
-- Devuelve false si ya no se podía rechazar (ej. otro lo recibió).
create or replace function public.pedido_sector_rechazar(p_id_pedido uuid, p_sector text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_filas integer;
begin
  perform public.pedido_validar_sector(p_sector);

  update public.pedido
     set estado_pedido = 'rechazado',
         estado_cocina = null,
         estado_bar = null
   where id_pedido = p_id_pedido
     and estado_pedido in ('confirmado', 'en_preparacion')
     and (
       (p_sector = 'cocina' and estado_cocina is null)
       or (p_sector = 'bar' and estado_bar is null)
     );

  get diagnostics v_filas = row_count;

  return v_filas > 0;
end;
$$;

-- Deshace "Recibir" (por si se tocó por error): el pedido vuelve a
-- quedar para recibir. Si el otro sector no lo tiene en preparación, el
-- pedido vuelve a 'confirmado'.
create or replace function public.pedido_sector_devolver(p_id_pedido uuid, p_sector text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_filas integer;
begin
  perform public.pedido_validar_sector(p_sector);

  if p_sector = 'cocina' then
    update public.pedido
       set estado_cocina = null,
           estado_pedido = case when estado_bar is null then 'confirmado' else estado_pedido end
     where id_pedido = p_id_pedido
       and estado_cocina = 'en_preparacion'
       and estado_pedido = 'en_preparacion';
  else
    update public.pedido
       set estado_bar = null,
           estado_pedido = case when estado_cocina is null then 'confirmado' else estado_pedido end
     where id_pedido = p_id_pedido
       and estado_bar = 'en_preparacion'
       and estado_pedido = 'en_preparacion';
  end if;

  get diagnostics v_filas = row_count;

  return v_filas > 0;
end;
$$;

revoke execute on function public.pedido_sector_rechazar(uuid, text) from public, anon;
revoke execute on function public.pedido_sector_devolver(uuid, text) from public, anon;
grant execute on function public.pedido_sector_rechazar(uuid, text) to authenticated;
grant execute on function public.pedido_sector_devolver(uuid, text) to authenticated;

revoke execute on function public.pedido_validar_sector(text) from public, anon;
revoke execute on function public.pedido_sector_recibir(uuid, text) from public, anon;
revoke execute on function public.pedido_sector_listo(uuid, text) from public, anon;
grant execute on function public.pedido_sector_recibir(uuid, text) to authenticated;
grant execute on function public.pedido_sector_listo(uuid, text) to authenticated;

-- La pantalla de cocina escucha los cambios de pedido en tiempo real.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'pedido'
  ) then
    alter publication supabase_realtime add table public.pedido;
  end if;
end $$;

-- Que la API vea las columnas y funciones nuevas sin esperar.
notify pgrst, 'reload schema';
