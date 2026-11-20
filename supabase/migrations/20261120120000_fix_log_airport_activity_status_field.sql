-- Mismo bug de fondo que el de la columna id: log_airport_activity() referencia
-- new.status/old.status directo, pero en PL/pgSQL el acceso a un campo de un
-- RECORD se resuelve contra el tipo de fila real de la tabla que disparó el
-- trigger -- aunque el CASE jamás vaya a tomar esa rama para
-- airport_request_dismissals (que no tiene columna status), Postgres igual
-- intenta resolver new.status al armar el INSERT y truena con 42703.
--
-- Se cambia a extraer vía to_jsonb(new)->>'status', que es genérico para
-- cualquier forma de fila (devuelve NULL si la columna no existe, en vez de
-- reventar) -- así esta función queda segura para cualquier tabla airport_*
-- que se le agregue en el futuro, no solo para esta.

CREATE OR REPLACE FUNCTION public.log_airport_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'INSERT' then
    insert into public.airport_activity_log (table_name, record_id, action, actor_id, new_status, detail)
    values (
      tg_table_name,
      new.id,
      'insert',
      auth.uid(),
      case when tg_table_name in ('airport_requests', 'airport_offers') then to_jsonb(new)->>'status' else null end,
      to_jsonb(new)
    );
  elsif tg_op = 'UPDATE' then
    insert into public.airport_activity_log (table_name, record_id, action, actor_id, old_status, new_status, detail)
    values (
      tg_table_name,
      new.id,
      'update',
      auth.uid(),
      case when tg_table_name in ('airport_requests', 'airport_offers') then to_jsonb(old)->>'status' else null end,
      case when tg_table_name in ('airport_requests', 'airport_offers') then to_jsonb(new)->>'status' else null end,
      to_jsonb(new)
    );
  end if;
  return new;
end;
$function$;
