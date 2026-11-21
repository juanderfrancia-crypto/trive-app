-- El título de la notificación al conductor ("Nueva ruta personalizada") se
-- copió tal cual del título de la pantalla donde el PASAJERO crea la solicitud
-- (CreateAirportRequestScreen.tsx) -- no tiene sentido desde la perspectiva del
-- conductor, que no creó nada, le están pidiendo un viaje. El resto de la app
-- ya le dice "solicitud" a este concepto (pestaña "Solicitudes"), así que se
-- alinea el título con esa terminología. El mensaje ("Piden un viaje de...")
-- ya estaba bien, no cambia.
CREATE OR REPLACE FUNCTION public.notify_drivers_new_airport_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_origin text;
  v_destination text;
  v_passenger_id uuid;
  v_driver record;
BEGIN
  SELECT origin, destination, passenger_id
    INTO v_origin, v_destination, v_passenger_id
  FROM public.airport_requests
  WHERE id = p_request_id;

  IF v_origin IS NULL THEN
    RETURN;
  END IF;

  FOR v_driver IN
    SELECT id
    FROM public.profiles
    WHERE is_driver = true
      AND id <> v_passenger_id
      AND (
        preferred_municipality IS NULL
        OR v_origin ILIKE '%' || preferred_municipality || '%'
        OR v_destination ILIKE '%' || preferred_municipality || '%'
      )
  LOOP
    PERFORM public.notify_user(
      v_driver.id, 'trip_published', 'Nueva solicitud de viaje',
      'Piden un viaje de ' || v_origin || ' a ' || v_destination || '.',
      jsonb_build_object('request_id', p_request_id, 'origin', v_origin, 'destination', v_destination)
    );
  END LOOP;
END;
$function$;
