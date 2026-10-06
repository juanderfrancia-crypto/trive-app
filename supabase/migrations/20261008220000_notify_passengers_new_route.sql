-- Al publicar una ruta, avisa a los pasajeros cuyo municipio preferido es el origen o el destino.

CREATE OR REPLACE FUNCTION public.notify_passengers_new_route()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_user(
    p.id,
    'trip_published',
    'Nueva ruta publicada',
    NEW.origin || ' → ' || NEW.destination || ' · ' ||
      to_char(NEW.departure_time AT TIME ZONE 'America/Bogota', 'HH24:MI'),
    jsonb_build_object('route_id', NEW.id)
  )
  FROM public.profiles p
  WHERE p.id <> NEW.driver_id
    AND p.preferred_municipality IS NOT NULL
    AND (NEW.origin ILIKE '%' || p.preferred_municipality || '%'
         OR NEW.destination ILIKE '%' || p.preferred_municipality || '%');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_passengers_on_new_route ON public.routes;
CREATE TRIGGER notify_passengers_on_new_route
  AFTER INSERT ON public.routes
  FOR EACH ROW
  WHEN (NEW.status = 'scheduled')
  EXECUTE FUNCTION public.notify_passengers_new_route();

REVOKE EXECUTE ON FUNCTION public.notify_passengers_new_route() FROM PUBLIC, anon, authenticated;
