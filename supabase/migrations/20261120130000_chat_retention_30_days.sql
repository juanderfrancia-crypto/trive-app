-- Trive es de viajes rápidos (salen y terminan el mismo día) -- 90 días de
-- retención de chat era mucho más de lo que cualquier reclamo o reporte de
-- seguridad real necesita para investigarse. Se baja a 30 días, mismo criterio
-- de siempre (anclado a departure_time, no a la fecha del mensaje).

CREATE OR REPLACE FUNCTION public.cleanup_old_trip_chat()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  delete from public.trip_messages tm
  using public.routes r
  where tm.trip_id = r.id
    and r.departure_time < now() - interval '30 days';

  delete from public.negotiation_messages nm
  using public.airport_requests ar
  where nm.request_id = ar.id
    and ar.departure_time < now() - interval '30 days';
end;
$function$;
