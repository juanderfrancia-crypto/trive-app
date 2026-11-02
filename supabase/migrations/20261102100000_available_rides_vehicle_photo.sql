-- "Salidas de hoy" (Inicio) va a mostrar la foto real del vehículo como fondo del bloque
-- de la hora, pero available_rides no la traía (solo profiles.avatar_url del conductor,
-- como driver_photo). Se agrega vehicle_photo del mismo profiles del conductor.
--
-- CREATE OR REPLACE VIEW solo permite agregar columnas al FINAL de la lista — insertarla
-- en medio (como se hizo en el primer intento de este archivo) corre la posición de las
-- columnas siguientes y Postgres lo rechaza como si fuera un renombre
-- (42P16: cannot change name of view column). vehicle_photo va al final.

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
  p.vehicle_photo_url AS vehicle_photo
FROM routes r
LEFT JOIN profiles p ON p.id = r.driver_id
WHERE r.departure_time > (now_bogota() - '00:15:00'::interval)
  AND r.departure_time <= (now_bogota() + '24:00:00'::interval)
  AND r.status::text = 'scheduled'::text
  AND r.available_seats > 0;
