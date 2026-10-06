-- departure_time es hora local sin zona: se muestra tal cual. La notificación incluye origen y destino para abrir la ruta.

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
    NEW.origin || ' → ' || NEW.destination || ' · ' || to_char(NEW.departure_time, 'HH24:MI'),
    jsonb_build_object(
      'route_id', NEW.id,
      'origin', NEW.origin,
      'destination', NEW.destination
    )
  )
  FROM public.profiles p
  WHERE p.id <> NEW.driver_id
    AND p.preferred_municipality IS NOT NULL
    AND (NEW.origin ILIKE '%' || p.preferred_municipality || '%'
         OR NEW.destination ILIKE '%' || p.preferred_municipality || '%');

  RETURN NEW;
END;
$$;
