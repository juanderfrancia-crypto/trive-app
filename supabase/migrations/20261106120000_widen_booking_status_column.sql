-- Bug real en producción: al completar un viaje, driver_set_route_status()
-- intenta poner booking_status = 'awaiting_confirmation' (21 caracteres),
-- pero la columna es varchar(20) -- 1 carácter más corto de lo necesario.
-- El valor 'awaiting_confirmation' ya estaba permitido en el check constraint
-- bookings_booking_status_check desde que se creó, así que esto es un
-- descuido de longitud, no un valor nuevo. Se amplía a varchar(30) para
-- dejar margen a futuros valores de estado sin volver a toparse con esto --
-- la validación real de qué valores son válidos ya la hace el check constraint,
-- no la longitud de la columna.
-- Postgres no deja cambiar el tipo de una columna de la que depende un trigger
-- (trigger_update_available_seats_on_booking_update), así que se quita y se
-- vuelve a crear igual, sin cambiar su lógica.
DROP TRIGGER IF EXISTS trigger_update_available_seats_on_booking_update ON public.bookings;

ALTER TABLE public.bookings ALTER COLUMN booking_status TYPE varchar(30);

CREATE TRIGGER trigger_update_available_seats_on_booking_update
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  WHEN (((old.booking_status)::text <> (new.booking_status)::text))
  EXECUTE FUNCTION update_route_available_seats();
