-- Chat Professional Features Migration
-- 1. message_reactions table for emoji reactions
-- 2. typing_indicators table for typing status
-- 3. Add last_seen column to profiles for online status

-- ============================================================================
-- TABLA: message_reactions (para reacciones emoji en mensajes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);

-- ============================================================================
-- TABLA: typing_indicators (para saber cuando alguien está escribiendo)
-- ============================================================================
CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_typing_indicators_from_user ON typing_indicators(from_user_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_to_user ON typing_indicators(to_user_id);

-- ============================================================================
-- COLUMNA: last_seen en profiles (para estado online/offline)
-- ============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- message_reactions: cualquier usuario puede ver reacciones de mensajes que puede ver
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "message_reactions_select" ON message_reactions
  FOR SELECT USING (true);

CREATE POLICY "message_reactions_insert" ON message_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "message_reactions_delete" ON message_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- typing_indicators: solo el usuario puede ver su propio typing
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "typing_indicators_select" ON typing_indicators
  FOR SELECT USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);

CREATE POLICY "typing_indicators_insert" ON typing_indicators
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "typing_indicators_update" ON typing_indicators
  FOR UPDATE USING (auth.uid() = from_user_id);

CREATE POLICY "typing_indicators_delete" ON typing_indicators
  FOR DELETE USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- profiles last_seen: cualquiera puede ver, solo el usuario puede actualizar
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_last_seen_select" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_last_seen_update" ON profiles
  FOR UPDATE USING (auth.uid() = id);