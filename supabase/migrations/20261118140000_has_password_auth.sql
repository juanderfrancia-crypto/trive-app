-- Chequeo correcto de "esta cuenta tiene una contrasena real?". Antes el
-- cliente lo deducia viendo si auth.users.identities tenia un proveedor
-- 'email' -- pero RecoveryEmailScreen.tsx (correo de recuperacion, una
-- funcion totalmente distinta a la contrasena) tambien crea esa identidad
-- via supabase.auth.updateUser({ email }) sin que exista ninguna contrasena.
-- Eso mostraba "Cambiar/Recuperar contrasena" a cualquiera que configurara
-- un correo de recuperacion, no solo a las cuentas viejas de correo+contrasena.
CREATE OR REPLACE FUNCTION public.has_password_auth()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND encrypted_password IS NOT NULL
      AND encrypted_password <> ''
  );
$$;

REVOKE ALL ON FUNCTION public.has_password_auth() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_password_auth() TO authenticated;
