-- Fase 2i: la fila del conductor se crea al guardar la cédula, antes de que suba la licencia.
-- License_number y license_expiry pasan a opcionales; la licencia se registra con su documento.

ALTER TABLE public.drivers ALTER COLUMN license_number DROP NOT NULL;
ALTER TABLE public.drivers ALTER COLUMN license_expiry DROP NOT NULL;
