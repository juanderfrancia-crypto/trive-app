-- profiles.total_trips nunca se actualizaba (ninguna migración ni trigger lo tocaba desde que
-- se creó la columna) -- se quedaba siempre en 0 sin importar cuántos viajes completara el
-- conductor. DriverHomeScreen.tsx muestra ese campo directamente, por eso "Viajes" siempre
-- marcaba 0 aunque hubiera viajes completados reales (confirmado: admin1@trive.com tenía 1
-- viaje completado real con total_trips=0). Se arregla con un trigger que lo recalcula cada
-- vez que una ruta cambia de estado, más un backfill de una sola vez para los datos existentes.

CREATE OR REPLACE FUNCTION public.recompute_driver_total_trips(p_driver_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET total_trips = (
    SELECT count(*) FROM public.routes WHERE driver_id = p_driver_id AND status = 'completed'
  )
  WHERE id = p_driver_id;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_driver_total_trips()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'completed' THEN
      PERFORM public.recompute_driver_total_trips(NEW.driver_id);
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.recompute_driver_total_trips(NEW.driver_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_driver_total_trips ON public.routes;
CREATE TRIGGER trigger_sync_driver_total_trips
  AFTER INSERT OR UPDATE OF status ON public.routes
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_driver_total_trips();

-- Backfill de una sola vez: corrige los perfiles que ya existen (ej. admin1@trive.com, que
-- tenía 1 viaje completado real con total_trips en 0).
UPDATE public.profiles p
SET total_trips = COALESCE(
  (SELECT count(*) FROM public.routes r WHERE r.driver_id = p.id AND r.status = 'completed'),
  0
);
