-- API Keys for AI Agents (external services)
CREATE TABLE agent_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key_hash TEXT NOT NULL UNIQUE,  -- SHA-256 hash of the actual key
  service_name TEXT NOT NULL,     -- e.g. "oo.ai", "o talk"
  display_name TEXT NOT NULL,     -- shown as author e.g. "oo.ai 에이전트"
  avatar_emoji TEXT DEFAULT '🤖',
  permissions TEXT[] DEFAULT ARRAY['read', 'write', 'comment'],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

-- Post status field for agent workflow
ALTER TABLE posts ADD COLUMN IF NOT EXISTS
  agent_status TEXT DEFAULT 'open'
  CHECK (agent_status IN ('open', 'in_progress', 'resolved', 'wont_fix'));

ALTER TABLE posts ADD COLUMN IF NOT EXISTS
  assigned_service TEXT;  -- which service is handling this (e.g. "oo.ai")

CREATE INDEX IF NOT EXISTS idx_posts_agent_status ON posts (agent_status);
