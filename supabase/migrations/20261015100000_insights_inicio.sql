-- ============================================================
-- Insights y alertas accionables para Inicio del back-office:
-- (1) get_staff_alerts: expedientes/tickets/disputas que llevan
--     demasiado tiempo sin atenderse, solo para quien tiene el cargo
--     correspondiente, solo si hay algo real que mostrar.
-- (2) get_passenger_retention + docs_approved/docs_rejected agregados
--     a get_dashboard_metrics (cargo 'analitica').
-- No se agrega "tasa de cancelación de rutas": investigado y es ruido
-- de las cuentas de prueba de desarrollo, no señal real todavía.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_staff_alerts()
RETURNS TABLE (kind text, item_count integer, message text, sample text, link text)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_sample text;
BEGIN
  IF public.is_admin_user() OR public.has_staff_role('verificacion') THEN
    SELECT COUNT(*) INTO v_count FROM (
      SELECT dd.driver_id
      FROM public.driver_documents dd
      WHERE dd.document_type IN ('cedula', 'licencia', 'tarjeta_propiedad', 'soat', 'tecnomecanica', 'antecedentes')
      GROUP BY dd.driver_id
      HAVING (COUNT(*) FILTER (WHERE dd.status = 'verified') < 6 OR COUNT(*) FILTER (WHERE dd.status = 'rejected') > 0)
         AND MIN(dd.uploaded_at) < public.now_bogota() - interval '5 days'
    ) q;

    IF v_count > 0 THEN
      SELECT string_agg(s.name, ', ') INTO v_sample FROM (
        SELECT p.name
        FROM public.driver_documents dd
        JOIN public.profiles p ON p.id = dd.driver_id
        WHERE dd.document_type IN ('cedula', 'licencia', 'tarjeta_propiedad', 'soat', 'tecnomecanica', 'antecedentes')
        GROUP BY dd.driver_id, p.name
        HAVING (COUNT(*) FILTER (WHERE dd.status = 'verified') < 6 OR COUNT(*) FILTER (WHERE dd.status = 'rejected') > 0)
           AND MIN(dd.uploaded_at) < public.now_bogota() - interval '5 days'
        ORDER BY MIN(dd.uploaded_at) ASC
        LIMIT 2
      ) s;

      kind := 'documentos';
      item_count := v_count;
      sample := v_sample;
      link := '/verificacion';
      message := v_count || CASE WHEN v_count = 1 THEN ' expediente lleva' ELSE ' expedientes llevan' END || ' más de 5 días esperando verificación';
      RETURN NEXT;
    END IF;
  END IF;

  IF public.is_admin_user() OR public.has_staff_role('atencion_cliente') THEN
    SELECT COUNT(*) INTO v_count
    FROM public.support_tickets
    WHERE status = 'open' AND created_at < now() - interval '24 hours';

    IF v_count > 0 THEN
      SELECT string_agg('"' || t.title || '"', ', ') INTO v_sample FROM (
        SELECT title FROM public.support_tickets
        WHERE status = 'open' AND created_at < now() - interval '24 hours'
        ORDER BY created_at ASC
        LIMIT 2
      ) t;

      kind := 'tickets';
      item_count := v_count;
      sample := v_sample;
      link := '/tickets';
      message := v_count || CASE WHEN v_count = 1 THEN ' ticket sin respuesta' ELSE ' tickets sin respuesta' END || ' hace más de 24 horas';
      RETURN NEXT;
    END IF;
  END IF;

  IF public.is_admin_user() OR public.has_staff_role('operaciones') THEN
    SELECT COUNT(*) INTO v_count
    FROM public.bookings b
    WHERE b.booking_status = 'disputed' AND b.updated_at < public.now_bogota() - interval '2 days';

    IF v_count > 0 THEN
      SELECT string_agg(r.origin || ' → ' || r.destination, ', ') INTO v_sample FROM (
        SELECT r.origin, r.destination
        FROM public.bookings b
        JOIN public.routes r ON r.id = b.route_id
        WHERE b.booking_status = 'disputed' AND b.updated_at < public.now_bogota() - interval '2 days'
        ORDER BY b.updated_at ASC
        LIMIT 2
      ) r;

      kind := 'disputas';
      item_count := v_count;
      sample := v_sample;
      link := '/disputas';
      message := v_count || CASE WHEN v_count = 1 THEN ' disputa sin resolver' ELSE ' disputas sin resolver' END || ' hace más de 2 días';
      RETURN NEXT;
    END IF;
  END IF;

  RETURN;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_staff_alerts() FROM PUBLIC, anon;

-- ============================================================
-- Retención de pasajeros (siempre histórico, no depende del rango de
-- fechas) + aprobación/rechazo de documentos del período: se agregan
-- a get_dashboard_metrics en vez de crear otra función aparte, mismo
-- cargo 'analitica' y mismo manejo de rango ya resuelto ahí.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(p_range text DEFAULT '30d')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamp;
  v_start timestamp;
  v_prev_start timestamp;
  v_result jsonb;
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('analitica')) THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  v_now := public.now_bogota();
  v_start := CASE p_range
    WHEN 'today' THEN date_trunc('day', v_now)
    WHEN '7d' THEN v_now - interval '7 days'
    WHEN 'month' THEN date_trunc('month', v_now)
    ELSE v_now - interval '30 days'
  END;
  v_prev_start := v_start - (v_now - v_start);

  SELECT jsonb_build_object(
    'trips_completed',
      (SELECT COUNT(*) FROM public.routes WHERE status = 'completed' AND departure_time >= v_start),
    'trips_completed_prev',
      (SELECT COUNT(*) FROM public.routes WHERE status = 'completed' AND departure_time >= v_prev_start AND departure_time < v_start),
    'revenue',
      (SELECT COALESCE(-SUM(amount), 0)::integer FROM public.wallet_transactions
       WHERE type IN ('route_fee', 'airport_fee') AND (created_at AT TIME ZONE 'America/Bogota') >= v_start),
    'drivers_verified',
      (SELECT COUNT(*) FROM public.profiles WHERE driver_verified = true),
    'drivers_verified_new',
      (SELECT COUNT(*) FROM public.profiles WHERE driver_verified = true AND driver_verified_at >= date_trunc('month', v_now)),
    'pending_files',
      (SELECT COUNT(*) FROM (
        SELECT dd.driver_id
        FROM public.driver_documents dd
        WHERE dd.document_type IN ('cedula', 'licencia', 'tarjeta_propiedad', 'soat', 'tecnomecanica', 'antecedentes')
        GROUP BY dd.driver_id
        HAVING COUNT(*) FILTER (WHERE dd.status = 'verified') < 6
            OR COUNT(*) FILTER (WHERE dd.status = 'rejected') > 0
      ) q),
    'docs_approved',
      (SELECT COUNT(*) FROM public.driver_documents WHERE status = 'verified' AND verified_at >= v_start),
    'docs_rejected',
      (SELECT COUNT(*) FROM public.driver_documents WHERE status = 'rejected' AND updated_at >= v_start),
    'passenger_retention',
      (SELECT jsonb_build_object(
        'total', COUNT(*),
        'repeat', COUNT(*) FILTER (WHERE cnt > 1),
        'rate', CASE WHEN COUNT(*) > 0 THEN ROUND(COUNT(*) FILTER (WHERE cnt > 1)::numeric / COUNT(*) * 100) ELSE 0 END
      ) FROM (
        SELECT passenger_id, COUNT(*) AS cnt
        FROM public.bookings
        WHERE booking_status = 'completed'
        GROUP BY passenger_id
      ) p),
    'trips_by_day',
      (SELECT COALESCE(jsonb_agg(jsonb_build_object('day', d, 'count', cnt) ORDER BY d), '[]'::jsonb)
       FROM (
         SELECT date_trunc('day', departure_time)::date AS d, COUNT(*) AS cnt
         FROM public.routes
         WHERE status = 'completed' AND departure_time >= v_now - interval '14 days'
         GROUP BY 1
       ) t),
    'top_routes',
      (SELECT COALESCE(jsonb_agg(jsonb_build_object('label', origin || ' → ' || destination, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
       FROM (
         SELECT origin, destination, COUNT(*) AS cnt
         FROM public.routes
         WHERE status = 'completed' AND departure_time >= v_start
         GROUP BY origin, destination
         ORDER BY cnt DESC
         LIMIT 5
       ) r),
    'pending_list',
      (SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'driver_id', sub.driver_id,
          'driver_name', sub.driver_name,
          'verified', sub.verified,
          'total', 6,
          'oldest', sub.oldest
        ) ORDER BY sub.oldest ASC), '[]'::jsonb)
       FROM (
         SELECT dd.driver_id, p.name AS driver_name,
                COUNT(*) FILTER (WHERE dd.status = 'verified') AS verified,
                MIN(dd.uploaded_at) AS oldest
         FROM public.driver_documents dd
         JOIN public.profiles p ON p.id = dd.driver_id
         WHERE dd.document_type IN ('cedula', 'licencia', 'tarjeta_propiedad', 'soat', 'tecnomecanica', 'antecedentes')
         GROUP BY dd.driver_id, p.name
         HAVING COUNT(*) FILTER (WHERE dd.status = 'verified') < 6
             OR COUNT(*) FILTER (WHERE dd.status = 'rejected') > 0
         ORDER BY MIN(dd.uploaded_at) ASC
         LIMIT 5
       ) sub)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
