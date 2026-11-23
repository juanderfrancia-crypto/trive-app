-- El conductor nunca se enteraba cuando su viaje se llenaba por completo (los
-- cupos quedaban en 0): update_route_available_seats() ya recalculaba
-- available_seats en cada insert/update/delete de bookings, pero no avisaba a
-- nadie cuando ese número llegaba a 0. Se agrega el aviso justo en el momento
-- en que pasa de tener cupos a no tener ninguno (no se repite si ya estaba
-- lleno, para no duplicar el push cuando se confirman varios asientos a la vez
-- en una sola transacción).

CREATE OR REPLACE FUNCTION public.update_route_available_seats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_route_id UUID;
  v_total_seats INT;
  v_confirmed_count INT;
  v_was_available INT;
  v_new_available INT;
  v_driver_id uuid;
  v_origin text;
  v_destination text;
BEGIN
  v_route_id := COALESCE(NEW.route_id, OLD.route_id);

  SELECT total_seats, available_seats, driver_id, origin, destination
    INTO v_total_seats, v_was_available, v_driver_id, v_origin, v_destination
  FROM routes WHERE id = v_route_id;

  IF v_total_seats IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COUNT(*) INTO v_confirmed_count
  FROM bookings
  WHERE route_id = v_route_id
  AND booking_status = 'confirmed';

  v_new_available := GREATEST(0, v_total_seats - v_confirmed_count);

  UPDATE routes
  SET available_seats = v_new_available,
      updated_at = NOW()
  WHERE id = v_route_id;

  IF v_new_available = 0 AND v_was_available > 0 THEN
    PERFORM notify_user(
      v_driver_id, 'trip_update', 'Tu viaje se llenó',
      'Tu ruta ' || v_origin || ' → ' || v_destination || ' ya no tiene cupos disponibles.',
      jsonb_build_object('route_id', v_route_id)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;
