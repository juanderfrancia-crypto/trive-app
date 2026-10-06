-- Al cerrar la cuenta, el saldo que quede se pierde y queda registrado en el libro.
-- Los términos (sección 7 y 8A) y LEGAL_POLITICA_REEMBOLSOS.md (sección 5) establecen esta regla.

ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type = ANY (ARRAY[
    'recharge', 'route_fee', 'route_fee_refund', 'airport_fee', 'airport_refund',
    'referral_bonus', 'referral_discount', 'admin_credit', 'admin_debit', 'account_closed'
  ]::text[]));

CREATE OR REPLACE FUNCTION public.anonymize_account(p_uid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
BEGIN
  SELECT balance INTO v_balance FROM public.profiles WHERE id = p_uid FOR UPDATE;

  IF v_balance IS NOT NULL AND v_balance > 0 THEN
    PERFORM public.post_wallet_movement(p_uid, -v_balance, 'account_closed');
  END IF;

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
      preferred_payment_method = NULL, balance = 0,
      is_driver = false, is_passenger = false, driver_active = false, updated_at = NOW()
  WHERE id = p_uid;
END;
$$;
