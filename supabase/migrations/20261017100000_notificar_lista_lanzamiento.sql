-- ============================================================
-- Agrega el campo para marcar a quién ya se le avisó que Trive
-- está disponible, así la función que manda el correo masivo no
-- le repite el aviso a quien ya lo recibió si se corre más de una vez.
-- ============================================================

ALTER TABLE public.launch_notify_subscribers
  ADD COLUMN IF NOT EXISTS notified_at timestamptz;
