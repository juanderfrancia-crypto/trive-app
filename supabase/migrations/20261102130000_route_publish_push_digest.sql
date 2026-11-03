-- Agrupa el PUSH de "ruta nueva" por pasajero dentro de una ventana corta (2 min)
-- para que publicar muchas rutas casi al tiempo no inunde a un mismo pasajero con
-- un push por cada una. A la escala de la prueba piloto (pocos conductores) nunca
-- se notó, pero a escala de todo el público sí: un pasajero cuyo municipio
-- preferido coincide con un corredor activo puede recibir decenas de rutas
-- publicadas en poco tiempo.
--
-- Patrón: el mismo que usan plataformas de notificaciones en producción
-- (OneSignal, Batch, SuprSend) para evitar fatiga de notificaciones — batching +
-- digest en vez de un push por evento. La campanita (notificación interna) NO
-- cambia: sigue mostrando una fila por cada ruta, igual que hoy. Solo se agrupa
-- la entrega por PUSH.
--
-- Mecanismo:
-- 1. notify_passengers_new_route() ya no dispara el push de inmediato
--    (send_push = false): la fila queda "retenida".
-- 2. Cada 2 minutos, dispatch_route_publish_digest() revisa qué pasajeros tienen
--    filas retenidas sin empujar (pushed_at IS NULL):
--      - si solo hay 1 ruta pendiente, manda el push exactamente igual que antes
--        (mismo título/mensaje) — el caso normal no cambia de experiencia, solo
--        se retrasa como máximo ~2 minutos.
--      - si hay varias, manda UN solo push resumen ("3 rutas nuevas en tu zona").
-- 3. No se inserta ninguna fila nueva en notifications (evita duplicar la
--    campanita): el digest llama directamente a la función send-push con el
--    mismo formato que ya usa el trigger normal.
-- 4. Ventana de seguridad de 30 min: si el cron estuviera caído más de eso, esas
--    filas viejas se dejan de empujar por push (quedan visibles igual en la
--    campanita) en vez de mandar de golpe un backlog grande cuando vuelva.

-- 1. Columna para saber qué filas de "ruta nueva" ya se incluyeron en un push.
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS pushed_at timestamptz;

-- 2. Retener el push de "ruta nueva" en vez de mandarlo de inmediato.
CREATE OR REPLACE FUNCTION public.notify_passengers_new_route()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data, is_read, send_push)
  SELECT
    p.id,
    'trip_published',
    'Nueva ruta publicada',
    NEW.origin || ' → ' || NEW.destination || ' · ' || to_char(NEW.departure_time, 'HH24:MI'),
    jsonb_build_object(
      'route_id', NEW.id,
      'origin', NEW.origin,
      'destination', NEW.destination
    ),
    false,
    false
  FROM public.profiles p
  WHERE p.id <> NEW.driver_id
    AND p.preferred_municipality IS NOT NULL
    AND (NEW.origin ILIKE '%' || p.preferred_municipality || '%'
         OR NEW.destination ILIKE '%' || p.preferred_municipality || '%');

  RETURN NEW;
END;
$$;

-- 3. Libera el push retenido, agrupado por pasajero.
CREATE OR REPLACE FUNCTION public.dispatch_route_publish_digest()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret text;
  v_records jsonb := '[]'::jsonb;
  r record;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'webhook_secret_send_push';

  IF v_secret IS NULL THEN
    RAISE WARNING 'webhook_secret_send_push no existe en Vault; no se envía digest de push';
    RETURN;
  END IF;

  FOR r IN
    SELECT user_id, array_agg(id ORDER BY created_at) AS ids, count(*) AS cnt
    FROM public.notifications
    WHERE type = 'trip_published'
      AND send_push = false
      AND pushed_at IS NULL
      AND created_at > now() - interval '30 minutes'
    GROUP BY user_id
  LOOP
    IF r.cnt = 1 THEN
      v_records := v_records || jsonb_build_array(
        (SELECT jsonb_build_object('user_id', user_id, 'title', title, 'message', message, 'data', data)
         FROM public.notifications WHERE id = r.ids[1])
      );
    ELSE
      v_records := v_records || jsonb_build_array(
        jsonb_build_object(
          'user_id', r.user_id,
          'title', '🚗 ' || r.cnt || ' rutas nuevas en tu zona',
          'message',
            (SELECT string_agg(DISTINCT (data->>'origin') || ' → ' || (data->>'destination'), '; ')
             FROM (SELECT data FROM public.notifications WHERE id = ANY(r.ids) ORDER BY created_at LIMIT 2) t2)
            || CASE WHEN r.cnt > 2 THEN ' y ' || (r.cnt - 2) || ' más' ELSE '' END,
          'data', jsonb_build_object('type', 'trip_published', 'digest_count', r.cnt)
        )
      );
    END IF;

    UPDATE public.notifications SET pushed_at = now() WHERE id = ANY(r.ids);
  END LOOP;

  IF jsonb_array_length(v_records) = 0 THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := 'https://iksenkkaxlmdiyeezoym.supabase.co/functions/v1/send-push',
    body := jsonb_build_object(
      'type', 'INSERT_BATCH',
      'records', v_records,
      'table', 'notifications_digest',
      'schema', 'public'
    ),
    params := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret
    ),
    timeout_milliseconds := 10000
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.dispatch_route_publish_digest() FROM PUBLIC, anon, authenticated;

-- 4. Cron cada 2 minutos (mismo patrón condicional que close_expired_routes).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('dispatch-route-publish-digest');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    PERFORM cron.schedule(
      'dispatch-route-publish-digest',
      '*/2 * * * *',
      'select public.dispatch_route_publish_digest()'
    );
  END IF;
END $$;
