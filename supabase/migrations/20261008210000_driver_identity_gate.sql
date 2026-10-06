-- El rol de conductor solo se concede cuando los documentos están aprobados y la cédula está guardada
-- en drivers. Así no existe un conductor verificado sin fila en drivers, que puede_conducir necesita.

CREATE OR REPLACE FUNCTION public.sync_driver_verified(p_uid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.check_all_documents_verified(p_uid)
     AND EXISTS (SELECT 1 FROM public.drivers WHERE id = p_uid AND national_id IS NOT NULL) THEN
    UPDATE public.profiles
    SET role = 'driver',
        is_driver = true,
        driver_verified = true,
        driver_verified_at = COALESCE(driver_verified_at, NOW()),
        is_driver_verified = true,
        updated_at = NOW()
    WHERE id = p_uid;
  ELSE
    UPDATE public.profiles
    SET driver_verified = false,
        is_driver_verified = false,
        updated_at = NOW()
    WHERE id = p_uid
      AND driver_verified = true;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_driver_verification_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_driver_verified(NEW.driver_id);
  RETURN NEW;
END;
$$;

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

  PERFORM public.sync_driver_verified(v_uid);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_driver_verified(uuid) FROM PUBLIC, anon, authenticated;
