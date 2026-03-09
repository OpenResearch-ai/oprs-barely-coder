-- Add moderation status to posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS
  status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('pending', 'active', 'rejected'));

-- Add moderation metadata
ALTER TABLE posts ADD COLUMN IF NOT EXISTS ai_moderation_result JSONB;

-- Index for filtering active posts
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts (status);

-- Update RLS: public can only see active posts
DROP POLICY IF EXISTS "posts_select" ON posts;
CREATE POLICY "posts_select" ON posts
  FOR SELECT USING (status = 'active');

-- Service role can see all (for moderation)
-- (service role bypasses RLS by default)
