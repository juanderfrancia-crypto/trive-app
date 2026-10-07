-- El cupo máximo real es el de un bus (55), no 70. Ajusta el límite puesto en
-- 20261008270000_airport_requests_vehicle_type.sql.

ALTER TABLE public.airport_requests DROP CONSTRAINT IF EXISTS airport_requests_passengers_check;
ALTER TABLE public.airport_requests ADD CONSTRAINT airport_requests_passengers_check
  CHECK (passengers BETWEEN 1 AND 55);
