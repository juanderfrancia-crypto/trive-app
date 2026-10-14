-- Back-office: métricas y reportes. Cargo 'analitica' (o is_admin_user/
-- administrador_general). Todo en una sola función para que la pantalla
-- haga un solo viaje al servidor, no media docena de consultas sueltas.

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
  -- mismo tamaño de período, inmediatamente anterior, para el delta "vs. anterior".
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

REVOKE EXECUTE ON FUNCTION public.get_dashboard_metrics(text) FROM PUBLIC, anon;
