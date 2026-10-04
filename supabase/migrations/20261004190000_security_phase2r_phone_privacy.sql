-- Fase 2r: el teléfono solo se libera cuando hay un viaje aceptado entre las dos personas.
-- Quitamos a los usuarios autenticados el permiso de LEER la columna phone de profiles.
-- Cada quien lee su propio teléfono con get_my_phone(). El de otra persona solo con
-- get_counterpart_phone(), y solo si hay una reserva confirmada o una solicitud aceptada entre ambos.

-- Columnas de perfil que sí puede leer la app (todas menos phone).
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, name, email, avatar_url, role, rating, total_trips, total_spent,
  is_driver_verified, created_at, updated_at, is_driver, is_passenger, driver_active,
  is_admin, driver_verified, driver_verified_at, profile_photo_url, push_token,
  notification_preferences, membership_type, membership_expiry, vehicle_photo_url,
  last_seen, balance, referral_code, referred_by, emergency_contact, preferred_municipality
) ON public.profiles TO authenticated;

-- Mi propio teléfono.
CREATE OR REPLACE FUNCTION public.get_my_phone()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT phone FROM public.profiles WHERE id = auth.uid();
$$;

-- Hay una relación de viaje aceptado entre dos personas (en cualquiera de los dos sentidos).
CREATE OR REPLACE FUNCTION public.has_accepted_trip_between(p_a uuid, p_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b JOIN public.routes r ON r.id = b.route_id
    WHERE b.booking_status IN ('confirmed', 'awaiting_confirmation', 'completed', 'disputed')
      AND ((b.passenger_id = p_a AND r.driver_id = p_b) OR (b.passenger_id = p_b AND r.driver_id = p_a))
  )
  OR EXISTS (
    SELECT 1 FROM public.airport_requests ar
    WHERE ar.status IN ('accepted', 'in_progress', 'completed')
      AND ((ar.passenger_id = p_a AND ar.driver_id = p_b) OR (ar.passenger_id = p_b AND ar.driver_id = p_a))
  );
$$;

-- Teléfono de otra persona, solo con viaje aceptado entre ambos.
CREATE OR REPLACE FUNCTION public.get_counterpart_phone(p_user uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN public.has_accepted_trip_between(auth.uid(), p_user)
              THEN (SELECT phone FROM public.profiles WHERE id = p_user)
         END;
$$;

-- Pasajeros de una ruta con su teléfono (solo para el conductor de la ruta).
CREATE OR REPLACE FUNCTION public.get_route_passenger_phones(p_route_id uuid)
RETURNS TABLE(passenger_id uuid, phone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.passenger_id, pr.phone
  FROM public.bookings b
  JOIN public.routes r ON r.id = b.route_id
  JOIN public.profiles pr ON pr.id = b.passenger_id
  WHERE b.route_id = p_route_id
    AND r.driver_id = auth.uid()
    AND b.booking_status IN ('confirmed', 'awaiting_confirmation', 'completed', 'disputed');
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_phone() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_counterpart_phone(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_route_passenger_phones(uuid) FROM PUBLIC, anon;
