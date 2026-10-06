-- Corrige la columna de preferencia de pago: existencia, restricción y permisos de lectura.
-- Los permisos de SELECT en profiles son por columna (fase 2r), así que la columna nueva también necesita GRANT SELECT.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_payment_method text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_preferred_payment_method_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_preferred_payment_method_check
      CHECK (preferred_payment_method IN ('cash', 'transfer'));
  END IF;
END $$;

GRANT SELECT (preferred_payment_method) ON public.profiles TO authenticated;
GRANT UPDATE (preferred_payment_method) ON public.profiles TO authenticated;
