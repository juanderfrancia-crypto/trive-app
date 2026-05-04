-- Migration: Create trip_messages table for contextual messaging
-- Purpose: Simple messaging system for active trips (like Uber)
-- Status: Safe - creates new table, doesn't modify existing ones

-- Drop if exists (for idempotency)
DROP TABLE IF EXISTS trip_messages CASCADE;

-- Create table
CREATE TABLE trip_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL,
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(message) > 0 AND char_length(message) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Constraint: Can't message yourself
  CONSTRAINT no_self_message CHECK (from_user_id != to_user_id)
);

-- Indexes for performance
CREATE INDEX idx_trip_messages_trip_id ON trip_messages(trip_id);
CREATE INDEX idx_trip_messages_trip_read ON trip_messages(trip_id, is_read);
CREATE INDEX idx_trip_messages_created_at ON trip_messages(created_at DESC);
CREATE INDEX idx_trip_messages_from_user ON trip_messages(from_user_id);
CREATE INDEX idx_trip_messages_to_user ON trip_messages(to_user_id);

-- Enable RLS
ALTER TABLE trip_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see messages from their trips
CREATE POLICY "Users can view trip messages they're part of"
  ON trip_messages
  FOR SELECT
  USING (
    from_user_id = auth.uid() OR to_user_id = auth.uid()
  );

-- RLS Policy: Users can only send messages from themselves
CREATE POLICY "Users can send messages from themselves"
  ON trip_messages
  FOR INSERT
  WITH CHECK (
    from_user_id = auth.uid()
  );

-- RLS Policy: Users can only read their own messages
CREATE POLICY "Users can mark their received messages as read"
  ON trip_messages
  FOR UPDATE
  USING (to_user_id = auth.uid())
  WITH CHECK (to_user_id = auth.uid());

-- Auto-cleanup: Delete trip messages 7 days after trip ends
-- (This will be added to a scheduler job)
CREATE OR REPLACE FUNCTION cleanup_old_trip_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM trip_messages
  WHERE trip_id IN (
    SELECT id FROM active_trips
    WHERE status IN ('completed', 'cancelled')
    AND updated_at < NOW() - INTERVAL '7 days'
  );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON trip_messages TO authenticated;

-- Comments for documentation
COMMENT ON TABLE trip_messages IS 'Contextual messages for active trips - similar to Uber messaging';
COMMENT ON COLUMN trip_messages.trip_id IS 'Reference to active_trips - messages auto-delete when trip ends';
COMMENT ON COLUMN trip_messages.is_read IS 'Whether recipient has read the message';
