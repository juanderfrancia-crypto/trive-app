-- Fase 2m: la placa se acepta con o sin guiones y espacios (ABC-123 = ABC123).
-- Se normaliza antes de validar el formato y de buscar duplicados.

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
  v_plate text := upper(regexp_replace(COALESCE(p_plate, ''), '[^A-Za-z0-9]', '', 'g'));
  v_vehicle public.vehicles%ROWTYPE;
BEGIN
  IF v_uid IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_uid AND role = 'driver'
  ) THEN
    RAISE EXCEPTION 'Solo los conductores pueden registrar vehículos';
  END IF;

  IF v_plate !~ '^[A-Z]{3}[0-9]{3}$' AND v_plate !~ '^[A-Z]{3}[0-9]{2}[A-Z]$' THEN
    RAISE EXCEPTION 'La placa no tiene un formato válido (ejemplo: ABC-123)';
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
    SELECT * INTO v_vehicle FROM public.vehicles
    WHERE plate = v_plate AND status IN ('pending', 'verified') AND driver_id = v_uid;
  END;

  RETURN v_vehicle;
END;
$$;
