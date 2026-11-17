-- Registro auditable de consentimiento a Términos/Privacidad (Ley 1581 de 2012, art. 9:
-- autorización previa, expresa e informada). El consentimiento en sí ya se obtenía en el
-- registro (texto "Al continuar aceptas..." justo antes de enviar el código SMS, ver
-- TermsText en LoginPhoneScreen.tsx) -- lo que faltaba era guardar CUÁNDO y QUÉ VERSIÓN
-- de los términos aceptó cada usuario, para poder demostrarlo si algún día lo piden.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terms_version text;

-- profiles usa permisos por columna (ver 20261004190000_security_phase2r_phone_privacy.sql)
-- -- sin este GRANT explícito, escribir estas columnas fallaría en silencio por permiso,
-- igual que ya pasó con push_token_debug (20261101120000_grant_push_token_debug.sql).
GRANT UPDATE (terms_accepted_at, terms_version) ON public.profiles TO authenticated;
GRANT SELECT (terms_accepted_at, terms_version) ON public.profiles TO authenticated;

-- Backfill para las cuentas que ya existían antes de este tracking: se asume que aceptaron
-- al momento de crear su cuenta (mismo texto/flujo de siempre, solo que no se registraba).
-- No es un registro literal del evento histórico, es la mejor aproximación disponible --
-- mejor que dejarlo vacío para siempre y no poder mostrar nada si algún día se audita.
UPDATE public.profiles
SET terms_accepted_at = created_at, terms_version = 'legacy-pre-tracking'
WHERE terms_accepted_at IS NULL;
