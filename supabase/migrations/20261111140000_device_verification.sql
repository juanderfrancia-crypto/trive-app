-- Punto 3 del plan de seguridad (ver memoria project_seguridad_cuenta_unica_dispositivo):
-- si alguien entra por OTP desde un dispositivo que esa cuenta nunca ha usado, pedir los
-- últimos 4 dígitos de la cédula antes de dejarlo entrar -- para que el OTP solo (robado
-- el número, SIM swap) no alcance para tomar la cuenta.
--
-- El "primer dispositivo" de una cuenta se confía automáticamente (sin esto, todos los
-- usuarios que ya existen quedarían bloqueados en su próximo login) -- solo se exige la
-- verificación desde el SEGUNDO dispositivo en adelante.
--
-- Ninguna de las dos tablas tiene GRANT directo para el cliente -- todo pasa por las
-- funciones SECURITY DEFINER de abajo, igual que ya hace get_my_phone()/get_my_cedula().

CREATE TABLE IF NOT EXISTS public.recognized_devices (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, device_id)
);
ALTER TABLE public.recognized_devices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.recognized_devices FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.device_verification_guard (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  failed_attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz
);
ALTER TABLE public.device_verification_guard ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.device_verification_guard FROM PUBLIC, anon, authenticated;

-- Se llama en cada restauración de sesión. Si el dispositivo ya está reconocido, refresca
-- last_seen_at y devuelve 'recognized'. Si la cuenta no tiene NINGÚN dispositivo reconocido
-- todavía, confía en este (primera vez) y devuelve 'recognized'. Si ya hay otros
-- dispositivos reconocidos y este no es ninguno de ellos, devuelve 'needs_verification'.
CREATE OR REPLACE FUNCTION public.check_device(p_device_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
  v_any boolean;
BEGIN
  IF p_device_id IS NULL OR auth.uid() IS NULL THEN
    RETURN 'needs_verification';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.recognized_devices WHERE user_id = auth.uid() AND device_id = p_device_id
  ) INTO v_exists;

  IF v_exists THEN
    UPDATE public.recognized_devices SET last_seen_at = now()
      WHERE user_id = auth.uid() AND device_id = p_device_id;
    RETURN 'recognized';
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.recognized_devices WHERE user_id = auth.uid()) INTO v_any;

  IF NOT v_any THEN
    INSERT INTO public.recognized_devices (user_id, device_id) VALUES (auth.uid(), p_device_id)
      ON CONFLICT (user_id, device_id) DO NOTHING;
    RETURN 'recognized';
  END IF;

  RETURN 'needs_verification';
END;
$$;

-- Verifica los últimos 4 dígitos de la cédula del usuario autenticado. Si coinciden,
-- registra el dispositivo como reconocido. Con límite de intentos (5) y bloqueo de 15
-- minutos -- nunca expone la cédula completa, solo compara server-side.
CREATE OR REPLACE FUNCTION public.verify_cedula_last4_and_register_device(p_last4 text, p_device_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cedula text;
  v_locked_until timestamptz;
  v_failed int;
  v_new_locked_until timestamptz;
BEGIN
  IF auth.uid() IS NULL OR p_device_id IS NULL THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  SELECT locked_until, failed_attempts INTO v_locked_until, v_failed
  FROM public.device_verification_guard WHERE user_id = auth.uid();

  IF v_locked_until IS NOT NULL AND v_locked_until > now() THEN
    RETURN jsonb_build_object('ok', false, 'locked_until', v_locked_until);
  END IF;

  SELECT cedula INTO v_cedula FROM public.profiles WHERE id = auth.uid();

  IF v_cedula IS NOT NULL AND p_last4 IS NOT NULL AND right(v_cedula, 4) = p_last4 THEN
    INSERT INTO public.recognized_devices (user_id, device_id) VALUES (auth.uid(), p_device_id)
      ON CONFLICT (user_id, device_id) DO UPDATE SET last_seen_at = now();

    INSERT INTO public.device_verification_guard (user_id, failed_attempts, locked_until)
      VALUES (auth.uid(), 0, NULL)
      ON CONFLICT (user_id) DO UPDATE SET failed_attempts = 0, locked_until = NULL;

    RETURN jsonb_build_object('ok', true);
  END IF;

  v_failed := COALESCE(v_failed, 0) + 1;
  v_new_locked_until := CASE WHEN v_failed >= 5 THEN now() + interval '15 minutes' ELSE NULL END;

  INSERT INTO public.device_verification_guard (user_id, failed_attempts, locked_until)
    VALUES (auth.uid(), v_failed, v_new_locked_until)
    ON CONFLICT (user_id) DO UPDATE SET failed_attempts = v_failed, locked_until = v_new_locked_until;

  RETURN jsonb_build_object('ok', false, 'locked_until', v_new_locked_until);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_device(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_cedula_last4_and_register_device(text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.check_device(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.verify_cedula_last4_and_register_device(text, text) FROM PUBLIC, anon;
