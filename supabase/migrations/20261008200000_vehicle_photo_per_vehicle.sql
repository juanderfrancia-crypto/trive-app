-- La foto pertenece al vehículo, no al perfil. El cliente no puede escribir en vehicles,
-- así que la foto se guarda con una función que verifica que el vehículo sea del usuario.

ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS photo_url text;

UPDATE public.vehicles v
SET photo_url = p.vehicle_photo_url
FROM public.profiles p
WHERE p.id = v.driver_id
  AND v.photo_url IS NULL
  AND p.vehicle_photo_url IS NOT NULL
  AND (SELECT COUNT(*) FROM public.vehicles x
       WHERE x.driver_id = v.driver_id AND x.status IN ('pending', 'verified')) = 1;

CREATE OR REPLACE FUNCTION public.set_vehicle_photo(p_vehicle_id uuid, p_url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE public.vehicles
  SET photo_url = p_url, updated_at = NOW()
  WHERE id = p_vehicle_id AND driver_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vehículo no encontrado';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_vehicle_photo(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_vehicle_photo(uuid, text) TO authenticated;
