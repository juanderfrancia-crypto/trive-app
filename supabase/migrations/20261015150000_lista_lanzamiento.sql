-- ============================================================
-- Lista de correos de personas interesadas en que se les avise
-- cuando Trive esté disponible en Google Play. La llena la página
-- pública (trivesoft.com), sin ningún tipo de autenticación.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.launch_notify_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT launch_notify_subscribers_email_unique UNIQUE (email)
);

ALTER TABLE public.launch_notify_subscribers ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede registrar un correo (es un formulario público), pero
-- nadie puede leer la lista por esta vía — solo por el RPC de abajo,
-- restringido al equipo.
CREATE POLICY "anon puede registrar su correo"
  ON public.launch_notify_subscribers
  FOR INSERT
  TO anon
  WITH CHECK (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');

CREATE OR REPLACE FUNCTION public.get_launch_notify_subscribers()
RETURNS TABLE (id uuid, email text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('administrador_general') OR public.has_staff_role('operaciones')) THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  RETURN QUERY
  SELECT s.id, s.email, s.created_at
  FROM public.launch_notify_subscribers s
  ORDER BY s.created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_launch_notify_subscribers() FROM PUBLIC, anon;
