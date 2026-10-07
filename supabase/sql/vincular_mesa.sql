-- el cliente escanea el qr de su mesa y pasa a en_mesa
-- corre con permisos de la base porque el cliente no puede actualizar lista_espera directo
create or replace function public.vincular_mesa(p_mesa_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entrada record;
begin
  select id, mesa_id, estado
    into v_entrada
    from public.lista_espera
   where usuario_id = auth.uid()
     and estado in ('asignado', 'en_mesa')
   order by created_at desc
   limit 1
   for update;

  if not found then
    raise exception 'Todavía no tenés una mesa asignada.';
  end if;

  if v_entrada.mesa_id::text <> p_mesa_id then
    raise exception 'Esta no es tu mesa.';
  end if;

  if v_entrada.estado = 'asignado' then
    update public.lista_espera
       set estado = 'en_mesa',
           updated_at = now()
     where id = v_entrada.id;
  end if;
end;
$$;

revoke all on function public.vincular_mesa(text) from public;
grant execute on function public.vincular_mesa(text) to authenticated;
