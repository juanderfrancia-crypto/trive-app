-- Permite borrar un usuario desde el dashboard de Supabase sin que estas dos tablas lo bloqueen.
-- El registro se conserva y la referencia queda en NULL. Los borrados desde la app siguen usando anonymize_account.

ALTER TABLE public.admin_actions ALTER COLUMN admin_id DROP NOT NULL;

ALTER TABLE public.admin_actions DROP CONSTRAINT IF EXISTS admin_actions_admin_id_fkey;
ALTER TABLE public.admin_actions ADD CONSTRAINT admin_actions_admin_id_fkey
  FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.airport_requests DROP CONSTRAINT IF EXISTS airport_requests_driver_id_fkey;
ALTER TABLE public.airport_requests ADD CONSTRAINT airport_requests_driver_id_fkey
  FOREIGN KEY (driver_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
