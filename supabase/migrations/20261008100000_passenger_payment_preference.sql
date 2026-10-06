-- Preferencia de pago del pasajero: el pago va directo al conductor (efectivo o transferencia).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_payment_method text
  CHECK (preferred_payment_method IN ('cash', 'transfer'));

GRANT UPDATE (preferred_payment_method) ON public.profiles TO authenticated;

COMMENT ON COLUMN public.profiles.preferred_payment_method IS
  'Forma de pago preferida del pasajero: cash (efectivo) o transfer (Nequi, Daviplata o Bre-B con la llave del conductor).';
