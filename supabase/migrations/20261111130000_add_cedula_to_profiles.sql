-- Punto 2 del plan de seguridad (ver memoria project_seguridad_cuenta_unica_dispositivo):
-- cédula obligatoria para TODOS los usuarios (pasajeros y conductores), no solo como
-- documento de conductor. Nullable a nivel de BD porque los ~20 perfiles que ya existen
-- no la tienen todavía -- se la pide la app la próxima vez que entran (gate en
-- AppNavigator, igual que ya existe para teléfono). El check de formato y el índice
-- único (que ignora NULL) sí se exigen desde ya para cualquier cédula nueva que se guarde.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cedula text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_cedula_format_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_cedula_format_check
  CHECK (cedula IS NULL OR cedula ~ '^[0-9]{6,10}$');

CREATE UNIQUE INDEX IF NOT EXISTS profiles_cedula_unique_idx
  ON public.profiles (cedula)
  WHERE cedula IS NOT NULL;

-- profiles usa permisos por columna desde 20261003140000_security_phase2b1_money_core.sql
-- (REVOKE UPDATE + lista blanca) -- sin este GRANT explícito, cualquier intento de guardar
-- la cédula desde la app fallaría en silencio por permiso, igual que ya pasó una vez con
-- push_token_debug (ver 20261101120000_grant_push_token_debug.sql).
GRANT UPDATE (cedula) ON public.profiles TO authenticated;

-- La cédula NO se agrega al GRANT SELECT general de profiles (20261004190000_security_
-- phase2r_phone_privacy.sql) a propósito: ese SELECT lo puede leer cualquier usuario que
-- pueda ver el perfil de otro (can_view_profile), y la cédula es más sensible que el
-- teléfono -- nadie más que el dueño debe poder leerla. Mismo patrón que get_my_phone():
-- función propia para que cada quien lea solo la suya.
CREATE OR REPLACE FUNCTION public.get_my_cedula()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cedula FROM public.profiles WHERE id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_cedula() FROM PUBLIC, anon;
