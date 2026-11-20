-- La verificación de conductor exigía además una cédula guardada por separado
-- en public.drivers (vía set_driver_identity, pedida de nuevo en la pantalla de
-- documentos) -- pero todo usuario ya puso su cédula al registrarse
-- (profiles.cedula, obligatoria y única por profiles_cedula_unique_idx desde el
-- paso 2 del plan de seguridad). Pedirla otra vez era un dato duplicado y
-- confuso para el usuario. sync_driver_verified ahora valida contra
-- profiles.cedula en vez de la tabla drivers; se sigue llamando desde
-- update_driver_verification_status cada vez que un admin verifica un documento,
-- así que el flujo real de verificación no cambia, solo deja de depender de
-- ese segundo número.

CREATE OR REPLACE FUNCTION public.sync_driver_verified(p_uid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.check_all_documents_verified(p_uid)
     AND EXISTS (SELECT 1 FROM public.profiles WHERE id = p_uid AND cedula IS NOT NULL) THEN
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
$function$;
