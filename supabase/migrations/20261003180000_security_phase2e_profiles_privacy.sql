-- Fase 2e: privacidad de perfiles.
-- Cada usuario ve su propia fila. Ve la de otra persona solo si existe una relación real
-- entre ambos: reserva, solicitud, oferta, mensaje o chat. Los conductores con rutas
-- publicadas son visibles para buscar viajes. Los administradores ven todo.

-- ============================================================
-- 1. Función de visibilidad. Corre con permisos del dueño para evitar recursión de RLS.
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_view_profile(p_target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL AND (
      p_target = auth.uid()
      OR public.is_admin_user()
      -- Conductor con rutas publicadas: visible para buscar viajes
      OR EXISTS (SELECT 1 FROM public.routes r WHERE r.driver_id = p_target)
      -- Reservas de viajes por ruta, en cualquiera de los dos sentidos
      OR EXISTS (
        SELECT 1 FROM public.bookings b JOIN public.routes r ON r.id = b.route_id
        WHERE (b.passenger_id = auth.uid() AND r.driver_id = p_target)
           OR (r.driver_id = auth.uid() AND b.passenger_id = p_target)
      )
      -- Solicitudes de aeropuerto y ofertas
      OR EXISTS (
        SELECT 1 FROM public.airport_requests ar
        WHERE (ar.passenger_id = auth.uid() AND ar.driver_id = p_target)
           OR (ar.driver_id = auth.uid() AND ar.passenger_id = p_target)
      )
      OR EXISTS (
        SELECT 1 FROM public.airport_offers ao JOIN public.airport_requests ar ON ar.id = ao.request_id
        WHERE (ar.passenger_id = auth.uid() AND ao.driver_id = p_target)
           OR (ao.driver_id = auth.uid() AND ar.passenger_id = p_target)
      )
      -- Chats de negociación
      OR EXISTS (
        SELECT 1 FROM public.negotiation_messages nm
        WHERE (nm.passenger_id = auth.uid() AND nm.driver_id = p_target)
           OR (nm.driver_id = auth.uid() AND nm.passenger_id = p_target)
      )
      -- Chats de viaje
      OR EXISTS (
        SELECT 1 FROM public.trip_messages tm
        WHERE (tm.from_user_id = auth.uid() AND tm.to_user_id = p_target)
           OR (tm.to_user_id = auth.uid() AND tm.from_user_id = p_target)
      )
      -- Mensajes directos
      OR EXISTS (
        SELECT 1 FROM public.messages m
        WHERE (m.from_user_id = auth.uid() AND m.to_user_id = p_target)
           OR (m.to_user_id = auth.uid() AND m.from_user_id = p_target)
      )
    );
$$;

REVOKE EXECUTE ON FUNCTION public.can_view_profile(uuid) FROM PUBLIC, anon;

-- ============================================================
-- 2. Políticas de lectura de perfiles. Reemplaza la lectura pública.
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_last_seen_select" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;

CREATE POLICY profiles_select_visible ON public.profiles
  FOR SELECT TO authenticated
  USING (public.can_view_profile(id));

-- Duplicados de actualización: se conserva una sola política, la del propio usuario.
DROP POLICY IF EXISTS "Allow authenticated update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Duplicados de inserción: una sola política.
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- ============================================================
-- 3. Presencia: "visto por última vez" solo lo escribe el propio usuario (ya lo cubre
--    la lista blanca de columnas de la fase 2b).
-- ============================================================
