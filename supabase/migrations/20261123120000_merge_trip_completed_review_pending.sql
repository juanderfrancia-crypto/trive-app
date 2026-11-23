CREATE OR REPLACE FUNCTION public.complete_booking_internal(p_booking_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_driver_id uuid;
  v_passenger_id uuid;
  v_referred_by text;
  v_referrer_id uuid;
  c_bonus constant integer := 2500;
  c_discount constant integer := 1000;
BEGIN
  UPDATE public.bookings
  SET booking_status = 'completed',
      payment_status = 'completed',
      updated_at = NOW()
  WHERE id = p_booking_id
    AND booking_status IN ('awaiting_confirmation', 'disputed');

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT r.driver_id, b.passenger_id
    INTO v_driver_id, v_passenger_id
  FROM public.bookings b
  JOIN public.routes r ON r.id = b.route_id
  WHERE b.id = p_booking_id;

  -- Antes se mandaban dos notificaciones separadas ("Viaje confirmado" sin
  -- accion + "Como estuvo tu viaje?" con el boton Calificar) por el mismo
  -- evento. Se fusionan en una sola (review_pending) -- 23-nov-2026.
  PERFORM public.notify_user(
    v_passenger_id, 'review_pending', '¡Viaje confirmado!',
    'Gracias por confirmar. Califica a tu conductor.',
    jsonb_build_object('booking_id', p_booking_id, 'driver_id', v_driver_id)
  );

  -- Bono de referido: solo en la primera reserva completada del conductor referido.
  SELECT referred_by INTO v_referred_by FROM public.profiles WHERE id = v_driver_id;

  IF v_referred_by IS NOT NULL
     AND (SELECT COUNT(*) FROM public.bookings b
            JOIN public.routes r ON r.id = b.route_id
           WHERE r.driver_id = v_driver_id AND b.booking_status = 'completed') = 1
     AND NOT EXISTS (
       SELECT 1 FROM public.wallet_transactions
       WHERE user_id = v_driver_id AND type = 'referral_discount'
     ) THEN
    SELECT id INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = v_referred_by
      AND id <> v_driver_id;

    IF v_referrer_id IS NOT NULL THEN
      UPDATE public.profiles SET balance = balance + c_bonus WHERE id = v_referrer_id;
      PERFORM public.post_wallet_movement(v_referrer_id, c_bonus, 'referral_bonus');

      UPDATE public.profiles SET balance = balance + c_discount WHERE id = v_driver_id;
      PERFORM public.post_wallet_movement(v_driver_id, c_discount, 'referral_discount');

      PERFORM public.notify_user(
        v_referrer_id, 'trip_update', '¡Referido activo! +$2.500',
        'Tu conductor referido completó y confirmó su primera reserva. Te acreditamos $2.500 en tu billetera.',
        '{}'::jsonb
      );
      PERFORM public.notify_user(
        v_driver_id, 'trip_update', 'Bienvenido a Trive · $1.000 de regalo',
        'Completaste y confirmaste tu primera reserva como conductor referido. Te acreditamos $1.000 en tu billetera.',
        '{}'::jsonb
      );
    END IF;
  END IF;
END;
$function$;
