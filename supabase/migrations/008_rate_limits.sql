-- Rate limits table
CREATE TABLE rate_limits (
  id TEXT PRIMARY KEY,           -- "chat:user_id" | "chat:ip:hash" | "post:user_id"
  requests INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rate_limits_window ON rate_limits (window_start);

-- Auto cleanup old windows (via RLS — service role only)
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
-- No public access — only service role
