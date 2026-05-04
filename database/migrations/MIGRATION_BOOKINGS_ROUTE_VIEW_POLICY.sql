-- MIGRATION: Allow authenticated users to view bookings for a route when selecting seats

DROP POLICY IF EXISTS "Users can view bookings for available routes" ON bookings;

CREATE POLICY "Users can view bookings for available routes" ON bookings
  FOR SELECT USING (
    passenger_id::text = auth.uid() OR
    auth.uid() = (
      SELECT driver_id::text FROM routes WHERE routes.id = bookings.route_id
    ) OR
    EXISTS (
      SELECT 1 FROM routes WHERE routes.id = bookings.route_id AND routes.status = 'scheduled'
    )
  );

-- Fix cancelled bookings: allow the same seat number to be reused once a booking is cancelled.
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS unique_route_seat_confirmed,
  DROP CONSTRAINT IF EXISTS bookings_route_id_seat_number_key;

DROP INDEX IF EXISTS unique_route_seat_confirmed;
DROP INDEX IF EXISTS bookings_route_id_seat_number_key;

CREATE UNIQUE INDEX IF NOT EXISTS unique_route_seat_confirmed
  ON bookings(route_id, seat_number)
  WHERE booking_status != 'cancelled';
