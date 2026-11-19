-- La tarjeta de rutas disponibles ahora muestra la marca del vehiculo junto a la
-- placa y el color, pero available_rides no la traia. CREATE OR REPLACE VIEW solo
-- permite agregar columnas al FINAL de la lista (ver 20261102100000), asi que
-- vehicle_make va despues de vehicle_photo, no junto a vehicle_color/vehicle_plate.

CREATE OR REPLACE VIEW public.available_rides WITH (security_invoker = true) AS
SELECT
  r.id,
  r.driver_id,
  r.origin,
  r.destination,
  r.departure_time,
  r.arrival_time,
  r.price_per_seat,
  r.total_seats,
  r.available_seats,
  r.vehicle_type,
  r.vehicle_color,
  r.vehicle_plate,
  r.status,
  r.description,
  r.available_seats AS seats_available_count,
  p.id AS driver_user_id,
  p.name AS driver_name,
  p.avatar_url AS driver_photo,
  p.rating::numeric AS driver_rating,
  (SELECT count(*) FROM reviews rv WHERE rv.reviewee_id = r.driver_id) AS driver_review_count,
  r.created_at,
  r.updated_at,
  r.pickup_point,
  r.route_via,
  r.dropoff_point,
  p.vehicle_photo_url AS vehicle_photo,
  r.vehicle_make
FROM routes r
LEFT JOIN profiles p ON p.id = r.driver_id
WHERE r.departure_time > (now_bogota() - '00:15:00'::interval)
  AND r.departure_time <= (now_bogota() + '24:00:00'::interval)
  AND r.status::text = 'scheduled'::text
  AND r.available_seats > 0;
