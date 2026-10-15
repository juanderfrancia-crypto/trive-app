-- ============================================================
-- Moderación de cuentas: suspender/reactivar un conductor o pasajero
-- que incumpla las políticas de Trive. No existía ningún camino para
-- esto en el back-office (solo aprobar/rechazar documentos).
--
-- Suspender de verdad (bloquear el acceso) requiere el Admin API de
-- Supabase (auth.admin.updateUserById con ban_duration), que necesita
-- la clave service_role — eso lo hace la Edge Function moderate-account.
-- Esta migración agrega la columna de estado y la búsqueda de usuarios.
-- Cargo 'operaciones' (o administrador general).
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active'
  CHECK (account_status IN ('active', 'suspended'));

CREATE OR REPLACE FUNCTION public.search_users_for_moderation(p_query text)
RETURNS TABLE (id uuid, name text, email text, role text, account_status text)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('operaciones')) THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  RETURN QUERY
  SELECT p.id, p.name::text, p.email::text, p.role::text, p.account_status::text
  FROM public.profiles p
  WHERE p.name ILIKE '%' || p_query || '%' OR p.email ILIKE '%' || p_query || '%'
  ORDER BY p.name
  LIMIT 20;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.search_users_for_moderation(text) FROM PUBLIC, anon;
