-- ============================================================
-- Gestión de empleados desde el back-office. Crear la cuenta (auth.users)
-- requiere la clave service_role — eso lo hace la Edge Function
-- invite-employee. Esta migración cubre lo que sí puede vivir en RPCs
-- normales: listar empleados y asignar/quitar cargos a uno que ya existe.
-- Solo para administrador general (is_admin_user() o cargo 'administrador_general').
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_staff_employees()
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  roles text[],
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('administrador_general')) THEN
    RAISE EXCEPTION 'Solo el administrador general puede ver esta lista';
  END IF;

  RETURN QUERY
  SELECT p.id, p.name::text, p.email::text,
         COALESCE(array_agg(sr.role::text ORDER BY sr.role) FILTER (WHERE sr.role IS NOT NULL), ARRAY[]::text[]),
         p.created_at::timestamptz
  FROM public.staff_roles sr
  JOIN public.profiles p ON p.id = sr.employee_id
  GROUP BY p.id, p.name, p.email, p.created_at
  ORDER BY p.created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_staff_employees() FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.admin_assign_staff_role(p_employee_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('administrador_general')) THEN
    RAISE EXCEPTION 'Solo el administrador general puede asignar cargos';
  END IF;

  IF p_role NOT IN ('verificacion', 'contabilidad', 'atencion_cliente', 'operaciones', 'analitica', 'administrador_general') THEN
    RAISE EXCEPTION 'Cargo inválido';
  END IF;

  INSERT INTO public.staff_roles (employee_id, role)
  VALUES (p_employee_id, p_role)
  ON CONFLICT (employee_id, role) DO NOTHING;

  INSERT INTO public.admin_actions (admin_id, action, target_user_id, details)
  VALUES (auth.uid(), 'staff_role_assigned', p_employee_id, jsonb_build_object('role', p_role));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_assign_staff_role(uuid, text) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.admin_revoke_staff_role(p_employee_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining integer;
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('administrador_general')) THEN
    RAISE EXCEPTION 'Solo el administrador general puede quitar cargos';
  END IF;

  IF p_employee_id = auth.uid() AND p_role = 'administrador_general' THEN
    RAISE EXCEPTION 'No puedes quitarte tu propio cargo de administrador general';
  END IF;

  DELETE FROM public.staff_roles WHERE employee_id = p_employee_id AND role = p_role;

  SELECT COUNT(*) INTO v_remaining FROM public.staff_roles WHERE employee_id = p_employee_id;

  INSERT INTO public.admin_actions (admin_id, action, target_user_id, details)
  VALUES (auth.uid(), 'staff_role_revoked', p_employee_id, jsonb_build_object('role', p_role, 'remaining_roles', v_remaining));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_revoke_staff_role(uuid, text) FROM PUBLIC, anon;
