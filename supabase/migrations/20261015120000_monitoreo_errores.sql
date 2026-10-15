-- ============================================================
-- Monitoreo de errores del back-office, sin depender de un servicio
-- externo (Sentry, etc. necesitarían que el dueño cree una cuenta
-- aparte). Cualquier empleado autenticado puede reportar un error
-- (puede pasar antes de que se sepa su cargo); solo administrador
-- general puede leerlos.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.frontend_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id),
  message text NOT NULL,
  stack text,
  page_url text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_frontend_error_logs_created ON public.frontend_error_logs(created_at DESC);

ALTER TABLE public.frontend_error_logs ENABLE ROW LEVEL SECURITY;
-- Sin políticas: todo pasa por las RPCs de abajo.

CREATE OR REPLACE FUNCTION public.log_frontend_error(
  p_message text,
  p_stack text DEFAULT NULL,
  p_page_url text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.frontend_error_logs (user_id, message, stack, page_url, user_agent)
  VALUES (
    auth.uid(),
    left(coalesce(p_message, 'Error sin mensaje'), 2000),
    left(p_stack, 4000),
    left(p_page_url, 500),
    left(p_user_agent, 500)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_frontend_error(text, text, text, text) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.get_frontend_errors(p_limit integer DEFAULT 50)
RETURNS TABLE (
  id uuid,
  user_name text,
  message text,
  stack text,
  page_url text,
  user_agent text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('administrador_general')) THEN
    RAISE EXCEPTION 'Solo el administrador general puede ver esto';
  END IF;

  RETURN QUERY
  SELECT e.id, p.name::text, e.message, e.stack, e.page_url, e.user_agent, e.created_at
  FROM public.frontend_error_logs e
  LEFT JOIN public.profiles p ON p.id = e.user_id
  ORDER BY e.created_at DESC
  LIMIT LEAST(COALESCE(p_limit, 50), 200);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_frontend_errors(integer) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.clear_frontend_errors()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('administrador_general')) THEN
    RAISE EXCEPTION 'Solo el administrador general puede hacer esto';
  END IF;

  DELETE FROM public.frontend_error_logs;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.clear_frontend_errors() FROM PUBLIC, anon;
