-- User ban system
CREATE TABLE user_bans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  violation_content TEXT,        -- what they wrote that got them banned
  banned_until TIMESTAMPTZ NOT NULL,
  ban_count INTEGER NOT NULL DEFAULT 1,  -- escalates with repeat offenses
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)               -- one active ban record per user (upserted)
);

CREATE INDEX idx_user_bans_user_id ON user_bans (user_id);
CREATE INDEX idx_user_bans_until ON user_bans (banned_until);

ALTER TABLE user_bans ENABLE ROW LEVEL SECURITY;
-- Users can see their own ban status
CREATE POLICY "bans_self_select" ON user_bans FOR SELECT USING (auth.uid() = user_id);
