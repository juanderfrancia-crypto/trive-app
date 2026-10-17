-- ============================================================
-- get_launch_notify_subscribers() ahora también devuelve notified_at,
-- para que la pantalla "Lanzamiento" del back-office pueda mostrar a
-- quién ya se le avisó y habilitar el botón de avisar al resto.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_launch_notify_subscribers()
RETURNS TABLE (id uuid, email text, created_at timestamptz, notified_at timestamptz)
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
  SELECT s.id, s.email, s.created_at, s.notified_at
  FROM public.launch_notify_subscribers s
  ORDER BY s.created_at DESC;
END;
$$;
