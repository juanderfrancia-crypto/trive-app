-- La forma de pago del pasajero ya no usa tarjetas: se guarda en profiles.preferred_payment_method.
-- Se redefine anonymize_account sin la tabla payment_methods y luego se elimina la tabla.

CREATE OR REPLACE FUNCTION public.anonymize_account(p_uid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.bookings
  SET booking_status = 'cancelled', cancelled_at = NOW(),
      cancellation_reason = 'Cuenta eliminada', updated_at = NOW()
  WHERE passenger_id = p_uid AND booking_status IN ('pending', 'confirmed');

  UPDATE public.routes SET status = 'cancelled', updated_at = NOW()
  WHERE driver_id = p_uid AND status = 'scheduled';

  UPDATE public.airport_requests SET status = 'cancelled', cancelled_at = NOW()
  WHERE passenger_id = p_uid AND status IN ('pending', 'negotiating', 'accepted');

  UPDATE public.airport_offers SET status = 'rejected', responded_at = NOW()
  WHERE driver_id = p_uid AND status = 'pending';

  DELETE FROM public.notifications WHERE user_id = p_uid;
  DELETE FROM public.user_sessions WHERE user_id = p_uid;
  DELETE FROM public.travel_preferences WHERE user_id = p_uid;
  DELETE FROM public.trip_preferences WHERE user_id = p_uid;
  DELETE FROM public.favorite_routes WHERE user_id = p_uid;
  DELETE FROM public.saved_addresses WHERE user_id = p_uid;
  DELETE FROM public.user_notification_preferences WHERE user_id = p_uid;
  DELETE FROM public.user_activity WHERE user_id = p_uid;
  DELETE FROM public.driver_payment_methods WHERE driver_id = p_uid;

  UPDATE public.profiles
  SET name = 'Usuario eliminado', email = NULL, phone = NULL, avatar_url = NULL,
      profile_photo_url = NULL, vehicle_photo_url = NULL, emergency_contact = NULL,
      push_token = NULL, referral_code = NULL, notification_preferences = NULL,
      preferred_payment_method = NULL,
      is_driver = false, is_passenger = false, driver_active = false, updated_at = NOW()
  WHERE id = p_uid;
END;
$$;

DROP TABLE IF EXISTS public.payment_methods;
