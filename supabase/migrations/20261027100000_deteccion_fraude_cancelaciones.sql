-- ============================================================
-- Detección de patrones de cancelación anómalos: solo marca para que
-- un admin/operaciones lo revise en /moderacion — no toma ninguna
-- acción automática. La acción (suspender) ya existe desde la
-- migración 20261014170000_moderacion_cuentas.sql; esto le da al
-- admin una lista de a quién vale la pena mirar, en vez de depender
-- de que alguien ya sepa a quién buscar.
--
-- Umbral: se marca a alguien si su tasa de cancelación en los últimos
-- 30 días supera el doble del promedio de su mismo rol (conductor o
-- pasajero) Y al menos un 30% absoluto — lo segundo evita marcar
-- ruido cuando el promedio general ya es casi cero. Mínimo 5
-- publicaciones/reservas en la ventana para evitar falsos positivos
-- por muestra chica (alguien con 1 cancelada de 1 no es un patrón).
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_flagged_accounts()
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  role text,
  account_status text,
  cancelled_count bigint,
  total_count bigint,
  cancellation_rate numeric,
  population_avg_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_min_sample constant integer := 5;
  v_min_abs_rate constant numeric := 0.30;
BEGIN
  IF NOT (public.is_admin_user() OR public.has_staff_role('operaciones')) THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  RETURN QUERY
  WITH driver_stats AS (
    SELECT
      r.driver_id AS user_id,
      COUNT(*) FILTER (WHERE r.status = 'cancelled') AS cancelled,
      COUNT(*) AS total
    FROM public.routes r
    WHERE r.created_at >= now() - interval '30 days'
    GROUP BY r.driver_id
  ),
  driver_avg AS (
    SELECT COALESCE(SUM(cancelled)::numeric / NULLIF(SUM(total), 0), 0) AS avg_rate
    FROM driver_stats
  ),
  passenger_stats AS (
    SELECT
      b.passenger_id AS user_id,
      COUNT(*) FILTER (WHERE b.booking_status = 'cancelled') AS cancelled,
      COUNT(*) AS total
    FROM public.bookings b
    WHERE b.created_at >= now() - interval '30 days'
    GROUP BY b.passenger_id
  ),
  passenger_avg AS (
    SELECT COALESCE(SUM(cancelled)::numeric / NULLIF(SUM(total), 0), 0) AS avg_rate
    FROM passenger_stats
  ),
  flagged AS (
    SELECT
      ds.user_id,
      ds.cancelled,
      ds.total,
      (ds.cancelled::numeric / ds.total) AS rate,
      da.avg_rate
    FROM driver_stats ds, driver_avg da
    WHERE ds.total >= v_min_sample
      AND (ds.cancelled::numeric / ds.total) >= GREATEST(da.avg_rate * 2, v_min_abs_rate)

    UNION ALL

    SELECT
      ps.user_id,
      ps.cancelled,
      ps.total,
      (ps.cancelled::numeric / ps.total) AS rate,
      pa.avg_rate
    FROM passenger_stats ps, passenger_avg pa
    WHERE ps.total >= v_min_sample
      AND (ps.cancelled::numeric / ps.total) >= GREATEST(pa.avg_rate * 2, v_min_abs_rate)
  )
  SELECT
    p.id,
    p.name::text,
    p.email::text,
    p.role::text,
    p.account_status::text,
    f.cancelled,
    f.total,
    ROUND(f.rate, 3),
    ROUND(f.avg_rate, 3)
  FROM flagged f
  JOIN public.profiles p ON p.id = f.user_id
  ORDER BY f.rate DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_flagged_accounts() FROM PUBLIC, anon;
