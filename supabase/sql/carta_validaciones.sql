-- Validaciones de platos y postres en la base (punto 2).
-- Se ejecuta en Supabase > SQL Editor (se puede volver a correr).
--
-- Son las mismas reglas que valida la app en el alta y la edición de
-- platos y postres, repetidas en la base para que nadie pueda guardar un
-- dato inválido salteándose los formularios (API, panel de Supabase,
-- otra pantalla):
--   nombre              obligatorio, de 3 a 60 caracteres sin contar los
--                       espacios de los costados ("   " cuenta como vacío)
--   descripcion         obligatoria, de 10 a 250 caracteres, mismo criterio
--   tiempo_elaboracion  obligatorio, minutos enteros de 1 a 999
--   precio              obligatorio, mayor a 0, hasta 2 decimales y hasta
--                       9 cifras (el campo de la app admite 9 caracteres)
--   foto_1, 2 y 3       las tres obligatorias y con la dirección de la
--                       imagen subida (http/https)
--
-- La tabla carta la comparte con las bebidas (punto 3), que tienen su
-- propio formulario: por eso cada regla aplica solo a tipo plato y postre,
-- y las bebidas quedan como estaban.
--
-- Si ya hay platos o postres cargados que no cumplen alguna regla, la
-- regla igual se crea y vale para todo lo que se agregue o modifique desde
-- ahora; el SQL avisa cuáles filas viejas no la cumplen (ver la consulta
-- del final para encontrarlas y corregirlas).

do $$
declare
  v_reglas text[][] := array[
    array['carta_plato_nombre_valido',
          'tipo not in (''plato'', ''postre'') or (nombre is not null and length(btrim(nombre)) between 3 and 60)'],
    array['carta_plato_descripcion_valida',
          'tipo not in (''plato'', ''postre'') or (descripcion is not null and length(btrim(descripcion)) between 10 and 250)'],
    array['carta_plato_tiempo_valido',
          'tipo not in (''plato'', ''postre'') or (tiempo_elaboracion is not null and tiempo_elaboracion between 1 and 999 and tiempo_elaboracion = trunc(tiempo_elaboracion))'],
    array['carta_plato_precio_valido',
          'tipo not in (''plato'', ''postre'') or (precio is not null and precio > 0 and precio < 1000000000 and precio = round(precio::numeric, 2))'],
    array['carta_plato_fotos_validas',
          'tipo not in (''plato'', ''postre'') or (foto_1 is not null and foto_2 is not null and foto_3 is not null and foto_1 ~ ''^https?://'' and foto_2 ~ ''^https?://'' and foto_3 ~ ''^https?://'')']
  ];
  v_regla text[];
begin
  foreach v_regla slice 1 in array v_reglas loop
    execute format('alter table public.carta drop constraint if exists %I', v_regla[1]);

    -- "not valid": la regla vale desde ya para lo nuevo y lo modificado,
    -- sin fallar por filas viejas.
    execute format(
      'alter table public.carta add constraint %I check (%s) not valid',
      v_regla[1], v_regla[2]
    );

    -- Si todas las filas viejas la cumplen, queda validada del todo.
    begin
      execute format('alter table public.carta validate constraint %I', v_regla[1]);
    exception when check_violation then
      raise notice 'Hay platos o postres cargados que no cumplen %: corregilos (consulta al final del archivo).', v_regla[1];
    end;
  end loop;
end $$;

notify pgrst, 'reload schema';

-- Consulta para encontrar platos y postres viejos que no cumplen alguna
-- regla (correrla aparte si el SQL de arriba mostró algún aviso):
--
-- select id_carta, tipo, nombre, descripcion, tiempo_elaboracion, precio,
--        foto_1, foto_2, foto_3
--   from public.carta
--  where tipo in ('plato', 'postre')
--    and (
--      nombre is null or length(btrim(nombre)) not between 3 and 60
--      or descripcion is null or length(btrim(descripcion)) not between 10 and 250
--      or tiempo_elaboracion is null or tiempo_elaboracion not between 1 and 999
--      or tiempo_elaboracion <> trunc(tiempo_elaboracion)
--      or precio is null or precio <= 0 or precio >= 1000000000
--      or precio <> round(precio::numeric, 2)
--      or foto_1 !~ '^https?://' or foto_2 !~ '^https?://' or foto_3 !~ '^https?://'
--      or foto_1 is null or foto_2 is null or foto_3 is null
--    );
