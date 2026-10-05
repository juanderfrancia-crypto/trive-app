-- Llave Bre-B del conductor: se guarda aparte del número de celular.
alter table public.driver_payment_methods
  add column if not exists payment_key text;

alter table public.driver_payment_methods
  alter column phone_number drop not null;

comment on column public.driver_payment_methods.payment_key is
  'Llave Bre-B (celular, cédula/NIT, correo o alias). Solo para type = bre_b.';
