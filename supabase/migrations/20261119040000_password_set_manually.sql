-- has_password_auth() basado en auth.users.encrypted_password estaba mal: Supabase
-- le pone un hash interno a TODAS las cuentas (incluidas las de solo telefono), asi
-- que siempre devolvia true. Se reemplaza por una columna explicita que solo se marca
-- en el momento real en que alguien establece una contrasena (ChangePasswordScreen en
-- la app, o ResetPasswordPage en trive-web) -- la unica fuente de verdad confiable.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_set_manually boolean NOT NULL DEFAULT false;

-- Backfill: las cuentas viejas de correo+contrasena (ej. admin1@trive.com) tienen su
-- identidad 'email' creada en el mismo instante que la cuenta -- señal de que el correo
-- fue parte del registro original, no agregado despues como correo de recuperacion.
UPDATE public.profiles p
SET password_set_manually = true
WHERE EXISTS (
  SELECT 1
  FROM auth.identities i
  JOIN auth.users u ON u.id = i.user_id
  WHERE i.user_id = p.id
    AND i.provider = 'email'
    AND i.created_at <= u.created_at + INTERVAL '30 seconds'
);

CREATE OR REPLACE FUNCTION public.has_password_auth()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT password_set_manually FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Solo se puede marcar en true desde el servidor, nunca escribiendo la columna
-- directo desde el cliente -- se llama justo despues de un updateUser({ password })
-- exitoso, tanto en la app (ChangePasswordScreen) como en trive-web (ResetPasswordPage).
CREATE OR REPLACE FUNCTION public.mark_password_set()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles SET password_set_manually = true WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.has_password_auth() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_password_auth() TO authenticated;
REVOKE ALL ON FUNCTION public.mark_password_set() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_password_set() TO authenticated;
