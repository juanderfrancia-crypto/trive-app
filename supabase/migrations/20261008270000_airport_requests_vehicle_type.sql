-- Las rutas personalizadas ahora indican el vehículo que necesita el pasajero
-- (auto, minivan o buseta) y permiten grupos que quepan en esos vehículos.

ALTER TABLE public.airport_requests DROP CONSTRAINT IF EXISTS airport_requests_passengers_check;
ALTER TABLE public.airport_requests ADD CONSTRAINT airport_requests_passengers_check
  CHECK (passengers BETWEEN 1 AND 70);

ALTER TABLE public.airport_requests ADD COLUMN IF NOT EXISTS vehicle_type text NOT NULL DEFAULT 'auto';

ALTER TABLE public.airport_requests DROP CONSTRAINT IF EXISTS airport_requests_vehicle_type_check;
ALTER TABLE public.airport_requests ADD CONSTRAINT airport_requests_vehicle_type_check
  CHECK (vehicle_type IN ('auto', 'busetica', 'buseta'));
