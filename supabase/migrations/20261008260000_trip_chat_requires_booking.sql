-- El chat de viaje solo lo pueden usar el conductor y los pasajeros con una reserva activa en esa ruta.

CREATE OR REPLACE FUNCTION public.can_trip_chat(p_route_id uuid, p_other_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.routes r ON r.id = b.route_id
    WHERE b.route_id = p_route_id
      AND b.booking_status IN ('confirmed', 'awaiting_confirmation', 'disputed', 'completed')
      AND (
        (b.passenger_id = auth.uid() AND r.driver_id = p_other_user)
        OR (r.driver_id = auth.uid() AND b.passenger_id = p_other_user)
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_trip_chat(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_trip_chat(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can send messages from themselves" ON public.trip_messages;
CREATE POLICY "Users can send messages from themselves"
  ON public.trip_messages
  FOR INSERT
  TO public
  WITH CHECK (
    from_user_id = auth.uid()
    AND public.can_trip_chat(trip_id, to_user_id)
  );
