-- Fix 3: Tabla conversation_summaries + trigger automático
-- Ejecutar en Supabase SQL editor
-- Propósito: pre-calcular last_message y unread_count para getConversations() eficiente

-- ============================================================
-- 1. CREAR TABLA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.conversation_summaries (
  id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  other_user_id   UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message    TEXT,
  last_message_time TIMESTAMPTZ,
  unread_count    INTEGER       DEFAULT 0,
  updated_at      TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE(user_id, other_user_id)
);

-- ============================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.conversation_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversation_summaries_select_own"
  ON public.conversation_summaries
  FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- 3. FUNCIÓN DEL TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_conversation_summary_fn()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Actualizar para el receptor: incrementar unread_count
    INSERT INTO public.conversation_summaries
      (user_id, other_user_id, last_message, last_message_time, unread_count)
    VALUES
      (NEW.to_user_id, NEW.from_user_id, NEW.message, NEW.created_at, 1)
    ON CONFLICT (user_id, other_user_id) DO UPDATE
      SET last_message      = NEW.message,
          last_message_time = NEW.created_at,
          unread_count      = public.conversation_summaries.unread_count + 1,
          updated_at        = NOW();

    -- Actualizar para el emisor: solo last_message, sin unread
    INSERT INTO public.conversation_summaries
      (user_id, other_user_id, last_message, last_message_time, unread_count)
    VALUES
      (NEW.from_user_id, NEW.to_user_id, NEW.message, NEW.created_at, 0)
    ON CONFLICT (user_id, other_user_id) DO UPDATE
      SET last_message      = NEW.message,
          last_message_time = NEW.created_at,
          updated_at        = NOW();

  ELSIF TG_OP = 'UPDATE' THEN
    -- Mensaje marcado como leído: decrementar unread_count del receptor
    IF NEW.is_read = TRUE AND OLD.is_read = FALSE THEN
      UPDATE public.conversation_summaries
      SET unread_count = GREATEST(0, unread_count - 1),
          updated_at   = NOW()
      WHERE user_id = NEW.to_user_id
        AND other_user_id = NEW.from_user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. CREAR TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS update_conversation_summary ON public.messages;
CREATE TRIGGER update_conversation_summary
  AFTER INSERT OR UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_summary_fn();

-- ============================================================
-- 5. BACKFILL - Poblar tabla con conversaciones existentes
-- ============================================================

WITH ranked AS (
  SELECT
    from_user_id,
    to_user_id,
    message,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY LEAST(from_user_id, to_user_id), GREATEST(from_user_id, to_user_id)
      ORDER BY created_at DESC
    ) AS rn
  FROM public.messages
),
latest AS (
  SELECT from_user_id, to_user_id, message, created_at
  FROM ranked
  WHERE rn = 1
)
INSERT INTO public.conversation_summaries
  (user_id, other_user_id, last_message, last_message_time, unread_count)
SELECT
  l.to_user_id,
  l.from_user_id,
  l.message,
  l.created_at,
  (
    SELECT COUNT(*)
    FROM public.messages m2
    WHERE m2.from_user_id = l.from_user_id
      AND m2.to_user_id   = l.to_user_id
      AND m2.is_read      = FALSE
  )
FROM latest l
UNION ALL
SELECT
  l.from_user_id,
  l.to_user_id,
  l.message,
  l.created_at,
  0
FROM latest l
ON CONFLICT (user_id, other_user_id) DO UPDATE
  SET last_message      = EXCLUDED.last_message,
      last_message_time = EXCLUDED.last_message_time,
      unread_count      = EXCLUDED.unread_count,
      updated_at        = NOW();

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
-- SELECT COUNT(*) FROM public.conversation_summaries;
-- SELECT * FROM public.conversation_summaries LIMIT 10;
