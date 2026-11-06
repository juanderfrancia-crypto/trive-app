-- El filtro "Ofertas" del centro de notificaciones (NotificationsScreen.tsx) busca
-- notificaciones type IN ('offer_received','offer_accepted'), pero las 4 notificaciones
-- reales del flujo de ofertas de aeropuerto se creaban como 'trip_update'/'trip_confirmed'
-- -- caían todas en "Viajes" y "Ofertas" quedaba siempre vacío. Esta migración reclasifica
-- las 2 que viven en el servidor (las otras 2 viven en el cliente, useAirportNegotiation.ts).
-- No hace falta tocar el check constraint: 'offer_received' y 'offer_accepted' ya estaban
-- permitidos desde 20261004160000_security_phase2o_flow_consistency.sql.

CREATE OR REPLACE FUNCTION public.reject_airport_offer(p_offer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_passenger_id uuid;
  v_driver_id uuid;
  v_request_id uuid;
  v_status text;
  v_origin text;
  v_destination text;
BEGIN
  SELECT ar.passenger_id, ao.driver_id, ao.request_id, ao.status, ar.origin, ar.destination
    INTO v_passenger_id, v_driver_id, v_request_id, v_status, v_origin, v_destination
  FROM public.airport_offers ao
  JOIN public.airport_requests ar ON ar.id = ao.request_id
  WHERE ao.id = p_offer_id
  FOR UPDATE OF ao;

  IF v_passenger_id IS NULL THEN
    RAISE EXCEPTION 'Oferta no encontrada';
  END IF;

  IF auth.uid() IS DISTINCT FROM v_passenger_id THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'Esta oferta ya no está pendiente';
  END IF;

  UPDATE public.airport_offers
  SET status = 'rejected',
      responded_at = NOW()
  WHERE id = p_offer_id;

  PERFORM public.notify_user(
    v_driver_id, 'offer_received', 'Oferta no aceptada',
    'El pasajero no aceptó tu oferta para ' || v_origin || ' → ' || v_destination || '.',
    jsonb_build_object('request_id', v_request_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_airport_request_price(request_id uuid, new_price integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.airport_requests%ROWTYPE;
  o record;
BEGIN
  IF new_price <= 0 THEN
    RAISE EXCEPTION 'El precio debe ser mayor a 0';
  END IF;

  UPDATE public.airport_requests
  SET offered_price = new_price,
      price_updated_at = NOW()
  WHERE id = request_id
    AND status = 'pending'
    AND passenger_id = auth.uid()
  RETURNING * INTO r;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se pudo actualizar el precio. Verifica que la solicitud existe y está pendiente.';
  END IF;

  FOR o IN SELECT DISTINCT driver_id FROM public.airport_offers
           WHERE airport_offers.request_id = r.id AND status = 'pending' LOOP
    PERFORM public.notify_user(
      o.driver_id, 'offer_received', 'El pasajero subió el precio',
      r.origin || ' → ' || r.destination || ': nuevo precio $' || to_char(new_price, 'FM999G999G999') || '.',
      jsonb_build_object('request_id', r.id, 'new_price', new_price)
    );
  END LOOP;
END;
$$;
