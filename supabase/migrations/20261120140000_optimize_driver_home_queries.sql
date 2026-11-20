-- Optimización de rendimiento: dos RPC que combinan varias consultas en una sola.
-- No cambian ningún comportamiento visible, solo reducen el número de round-trips.

-- 1) Antes: DriverHomeScreen.loadAirportCount y useRequestsBadge.loadAirportRequests
-- hacían 3 consultas cada uno (perfil, descartes, TODAS las solicitudes pendientes del
-- país) y filtraban por municipio en el teléfono. Ahora el conteo se hace en la base,
-- con el mismo filtro de palabra completa (\y = límite de palabra en regex de Postgres,
-- equivalente al \b usado en el cliente) para no cambiar qué solicitudes cuentan.
CREATE OR REPLACE FUNCTION public.get_pending_airport_request_count(p_driver_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_municipality text;
  v_count integer;
BEGIN
  SELECT preferred_municipality INTO v_municipality
  FROM public.profiles
  WHERE id = p_driver_id;

  SELECT count(*) INTO v_count
  FROM public.airport_requests r
  WHERE r.status = 'pending'
    AND NOT EXISTS (
      SELECT 1 FROM public.airport_request_dismissals d
      WHERE d.request_id = r.id AND d.driver_id = p_driver_id
    )
    AND (
      v_municipality IS NULL
      OR r.origin ~* ('\y' || v_municipality || '\y')
      OR r.destination ~* ('\y' || v_municipality || '\y')
    );

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_pending_airport_request_count(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_pending_airport_request_count(uuid) TO authenticated;

-- 2) Antes: DriverPanelScreen pedía los teléfonos de pasajeros con una llamada RPC
-- POR CADA ruta activa del conductor. Ahora es una sola llamada con todos los IDs.
CREATE OR REPLACE FUNCTION public.get_route_passenger_phones_batch(p_route_ids uuid[])
RETURNS TABLE(route_id uuid, passenger_id uuid, phone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.route_id, b.passenger_id, pr.phone
  FROM public.bookings b
  JOIN public.routes r ON r.id = b.route_id
  JOIN public.profiles pr ON pr.id = b.passenger_id
  WHERE b.route_id = ANY(p_route_ids)
    AND r.driver_id = auth.uid()
    AND b.booking_status IN ('confirmed', 'awaiting_confirmation', 'completed', 'disputed');
$$;

REVOKE EXECUTE ON FUNCTION public.get_route_passenger_phones_batch(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_route_passenger_phones_batch(uuid[]) TO authenticated;
