-- Fase 2g: identidad del conductor y vehículos.
-- Cédula única por cuenta. Placa única entre vehículos vigentes. Un solo vehículo activo a la vez.
-- Un conductor solo puede publicar o aceptar si tiene identidad registrada, documentos aprobados
-- y un vehículo activo verificado.

-- ============================================================
-- 1. Cédula del conductor (número), única entre cuentas.
-- ============================================================
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS national_id text;

CREATE UNIQUE INDEX IF NOT EXISTS drivers_national_id_unique
  ON public.drivers (national_id)
  WHERE national_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_driver_identity(p_national_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id text := regexp_replace(COALESCE(p_national_id, ''), '\D', '', 'g');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF length(v_id) < 6 OR length(v_id) > 10 THEN
    RAISE EXCEPTION 'Ingresa un número de cédula válido';
  END IF;

  IF EXISTS (SELECT 1 FROM public.drivers WHERE national_id = v_id AND id <> v_uid) THEN
    RAISE EXCEPTION 'Esta cédula ya está registrada en otra cuenta';
  END IF;

  INSERT INTO public.drivers (id, national_id)
  VALUES (v_uid, v_id)
  ON CONFLICT (id) DO UPDATE SET national_id = EXCLUDED.national_id, updated_at = NOW();
END;
$$;

-- ============================================================
-- 2. Vehículos. Una placa solo puede estar en un vehículo vigente a la vez.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plate text NOT NULL,
  make text NOT NULL,
  year integer NOT NULL,
  color text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'rejected', 'released')),
  is_active boolean NOT NULL DEFAULT false,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  verified_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Una placa vigente (pendiente o verificada) pertenece a un solo vehículo.
CREATE UNIQUE INDEX IF NOT EXISTS vehicles_plate_vigente_unique
  ON public.vehicles (plate)
  WHERE status IN ('pending', 'verified');

-- Un solo vehículo activo por conductor.
CREATE UNIQUE INDEX IF NOT EXISTS vehicles_one_active_per_driver
  ON public.vehicles (driver_id)
  WHERE is_active;

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Solo lectura desde la API, y solo los propios. Las escrituras van por funciones.
REVOKE ALL ON public.vehicles FROM anon, authenticated;
GRANT SELECT ON public.vehicles TO authenticated;

DROP POLICY IF EXISTS vehicles_select_own ON public.vehicles;
CREATE POLICY vehicles_select_own ON public.vehicles
  FOR SELECT TO authenticated
  USING (driver_id = auth.uid());

-- Los vehículos se modifican solo con funciones.
ALTER TABLE public.routes ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES public.vehicles(id);

-- ============================================================
-- 3. Registrar un vehículo (queda pendiente de aprobación).
-- ============================================================
CREATE OR REPLACE FUNCTION public.register_vehicle(
  p_plate text,
  p_make text,
  p_year integer,
  p_color text
)
RETURNS public.vehicles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_plate text := upper(regexp_replace(COALESCE(p_plate, ''), '\s', '', 'g'));
  v_vehicle public.vehicles%ROWTYPE;
BEGIN
  IF v_uid IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_uid AND role = 'driver'
  ) THEN
    RAISE EXCEPTION 'Solo los conductores pueden registrar vehículos';
  END IF;

  IF v_plate !~ '^[A-Z]{3}[0-9]{3}$' AND v_plate !~ '^[A-Z]{3}[0-9]{2}[A-Z]$' THEN
    RAISE EXCEPTION 'La placa no tiene un formato válido';
  END IF;

  IF p_year IS NULL OR p_year < 1980 OR p_year > EXTRACT(YEAR FROM NOW())::int + 1 THEN
    RAISE EXCEPTION 'El año del vehículo no es válido';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.vehicles
    WHERE plate = v_plate AND status IN ('pending', 'verified') AND driver_id <> v_uid
  ) THEN
    RAISE EXCEPTION 'Esta placa ya está registrada por otro conductor';
  END IF;

  BEGIN
    INSERT INTO public.vehicles (driver_id, plate, make, year, color)
    VALUES (v_uid, v_plate, trim(p_make), p_year, trim(p_color))
    RETURNING * INTO v_vehicle;
  EXCEPTION WHEN unique_violation THEN
    -- Mismo conductor, misma placa vigente: se devuelve el registro existente.
    SELECT * INTO v_vehicle FROM public.vehicles
    WHERE plate = v_plate AND status IN ('pending', 'verified') AND driver_id = v_uid;
  END;

  RETURN v_vehicle;
END;
$$;

-- ============================================================
-- 4. Aprobación de vehículos: solo administradores.
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_vehicle(p_vehicle_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id uuid;
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT driver_id INTO v_driver_id FROM public.vehicles
  WHERE id = p_vehicle_id AND status = 'pending'
  FOR UPDATE;

  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'El vehículo no está pendiente de aprobación';
  END IF;

  UPDATE public.vehicles SET is_active = false, updated_at = NOW()
  WHERE driver_id = v_driver_id AND is_active;

  UPDATE public.vehicles
  SET status = 'verified', is_active = true, verified_at = NOW(), updated_at = NOW()
  WHERE id = p_vehicle_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_vehicle(p_vehicle_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE public.vehicles
  SET status = 'rejected', is_active = false, rejection_reason = p_reason, updated_at = NOW()
  WHERE id = p_vehicle_id AND status = 'pending';
END;
$$;

-- ============================================================
-- 5. El conductor libera un vehículo que vendió (la placa queda libre).
-- ============================================================
CREATE OR REPLACE FUNCTION public.release_vehicle(p_vehicle_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.routes r
    JOIN public.vehicles v ON v.id = r.vehicle_id
    WHERE v.id = p_vehicle_id AND r.status IN ('scheduled', 'in_progress')
  ) THEN
    RAISE EXCEPTION 'Este vehículo tiene viajes activos. Termínalos o cancélalos primero';
  END IF;

  UPDATE public.vehicles
  SET status = 'released', is_active = false, updated_at = NOW()
  WHERE id = p_vehicle_id AND driver_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
END;
$$;

-- ============================================================
-- 6. Requisitos para conducir: identidad, documentos y vehículo activo verificado.
-- ============================================================
CREATE OR REPLACE FUNCTION public.puede_conducir(p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.drivers d ON d.id = p.id
    WHERE p.id = p_user
      AND p.role = 'driver'
      AND p.driver_verified = true
      AND d.national_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.vehicles v
        WHERE v.driver_id = p_user AND v.is_active AND v.status = 'verified'
      )
  );
$$;

-- ============================================================
-- 7. Publicar ruta: el vehículo y sus datos salen del vehículo activo, no del cliente.
-- ============================================================
CREATE OR REPLACE FUNCTION public.publish_route(p_route jsonb)
RETURNS public.routes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_vehicle public.vehicles%ROWTYPE;
  v_route public.routes;
  c_fee constant integer := 2000;
BEGIN
  IF v_uid IS NULL OR NOT public.puede_conducir(v_uid) THEN
    RAISE EXCEPTION 'Tu cuenta de conductor aún no está aprobada para publicar viajes';
  END IF;

  SELECT * INTO v_vehicle FROM public.vehicles
  WHERE driver_id = v_uid AND is_active AND status = 'verified';

  UPDATE public.profiles
  SET balance = balance - c_fee
  WHERE id = v_uid AND balance >= c_fee;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Necesitas $2.000 de saldo para publicar un viaje';
  END IF;

  PERFORM public.post_wallet_movement(v_uid, -c_fee, 'route_fee');

  -- Columnas explícitas: el cliente solo aporta datos del viaje; el vehículo y el conductor los fija el servidor.
  INSERT INTO public.routes (
    driver_id, vehicle_id, origin, destination, departure_time, arrival_time,
    price_per_seat, total_seats, available_seats, status, description,
    pickup_point, pickup_point_custom, vehicle_type,
    vehicle_plate, vehicle_make, vehicle_year, vehicle_color
  )
  VALUES (
    v_uid, v_vehicle.id,
    p_route->>'origin',
    p_route->>'destination',
    (p_route->>'departure_time')::timestamp,
    NULLIF(p_route->>'arrival_time', '')::timestamp,
    (p_route->>'price_per_seat')::numeric,
    (p_route->>'total_seats')::integer,
    (p_route->>'total_seats')::integer,
    'scheduled',
    NULLIF(p_route->>'description', ''),
    NULLIF(p_route->>'pickup_point', ''),
    COALESCE((p_route->>'pickup_point_custom')::boolean, false),
    NULLIF(p_route->>'vehicle_type', ''),
    v_vehicle.plate,
    v_vehicle.make,
    v_vehicle.year,
    v_vehicle.color
  )
  RETURNING * INTO v_route;

  RETURN v_route;
END;
$$;

-- El cambio de datos del vehículo ahora es registrar uno nuevo y aprobarlo.
DROP FUNCTION IF EXISTS public.update_driver_vehicle(text, integer, text, text);
