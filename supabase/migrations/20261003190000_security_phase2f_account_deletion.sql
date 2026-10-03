-- Fase 2f: eliminación de cuenta.
-- Borra los datos personales y anonimiza el perfil. Conserva los registros financieros
-- (libro de movimientos, pagos y reservas) que la ley obliga a guardar, sin datos personales.
-- La autenticación se bloquea desde la función Edge "delete-account" (rol de servicio).

CREATE OR REPLACE FUNCTION public.anonymize_account(p_uid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cancelar lo que está activo: reservas y rutas futuras.
  UPDATE public.bookings
  SET booking_status = 'cancelled',
      cancelled_at = NOW(),
      cancellation_reason = 'Cuenta eliminada',
      updated_at = NOW()
  WHERE passenger_id = p_uid
    AND booking_status IN ('pending', 'confirmed');

  UPDATE public.routes
  SET status = 'cancelled',
      updated_at = NOW()
  WHERE driver_id = p_uid
    AND status = 'scheduled';

  -- Datos personales que no hacen falta para registros legales.
  DELETE FROM public.notifications WHERE user_id = p_uid;
  DELETE FROM public.user_sessions WHERE user_id = p_uid;
  DELETE FROM public.travel_preferences WHERE user_id = p_uid;
  DELETE FROM public.trip_preferences WHERE user_id = p_uid;
  DELETE FROM public.favorite_routes WHERE user_id = p_uid;
  DELETE FROM public.saved_addresses WHERE user_id = p_uid;
  DELETE FROM public.payment_methods WHERE user_id = p_uid;
  DELETE FROM public.user_notification_preferences WHERE user_id = p_uid;
  DELETE FROM public.user_activity WHERE user_id = p_uid;
  DELETE FROM public.driver_payment_methods WHERE driver_id = p_uid;

  -- Perfil anonimizado. Se conserva la fila para mantener integridad de reservas y pagos.
  UPDATE public.profiles
  SET name = 'Usuario eliminado',
      email = NULL,
      phone = NULL,
      avatar_url = NULL,
      profile_photo_url = NULL,
      vehicle_photo_url = NULL,
      emergency_contact = NULL,
      push_token = NULL,
      referral_code = NULL,
      notification_preferences = NULL,
      is_driver = false,
      is_passenger = false,
      driver_active = false,
      updated_at = NOW()
  WHERE id = p_uid;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.anonymize_account(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anonymize_account(uuid) TO service_role;
