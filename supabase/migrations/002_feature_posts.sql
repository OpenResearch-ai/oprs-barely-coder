-- =========================================
-- Feature Posts — AI-managed product backlog
-- =========================================

CREATE TABLE feature_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- AI-written content (updated continuously)
  title TEXT NOT NULL,
  summary TEXT,              -- balanced synthesis of all community input
  ai_reasoning TEXT,         -- why this was prioritized / de-prioritized
  call_to_action TEXT,       -- AI prompt encouraging votes/comments

  post_type TEXT NOT NULL DEFAULT 'feature'
    CHECK (post_type IN ('feature', 'bug', 'improvement')),

  product TEXT CHECK (product IN ('oo.ai', 'o talk', 'platform')),

  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_sprint', 'done', 'wont_fix')),

  -- Scoring (recomputed each sync)
  priority_score FLOAT NOT NULL DEFAULT 0,
  vote_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,

  -- Which community posts inspired this
  source_post_ids UUID[] DEFAULT '{}',

  -- Sprint linkage
  sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,

  last_ai_update TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feature_posts_product ON feature_posts (product);
CREATE INDEX idx_feature_posts_status ON feature_posts (status);
CREATE INDEX idx_feature_posts_priority ON feature_posts (priority_score DESC);

-- Votes on feature posts (separate from community post votes)
CREATE TABLE feature_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_post_id UUID NOT NULL REFERENCES feature_posts(id) ON DELETE CASCADE,
  -- allow anonymous votes via session fingerprint
  voter_key TEXT NOT NULL,   -- user_id if logged in, else IP hash
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (feature_post_id, voter_key)
);

CREATE INDEX idx_feature_votes_post ON feature_votes (feature_post_id);

-- Comments on feature posts
CREATE TABLE feature_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_post_id UUID NOT NULL REFERENCES feature_posts(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT 'anonymous',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feature_comments_post ON feature_comments (feature_post_id);

-- Track which community posts have been processed into feature posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS
  processed_into_feature UUID REFERENCES feature_posts(id) ON DELETE SET NULL;

-- Sync job log
CREATE TABLE sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  posts_processed INTEGER DEFAULT 0,
  feature_posts_created INTEGER DEFAULT 0,
  feature_posts_updated INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running',  -- 'running' | 'done' | 'error'
  error_message TEXT
);

-- Auto-update timestamps
CREATE TRIGGER feature_posts_updated_at
  BEFORE UPDATE ON feature_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-sync vote count
CREATE OR REPLACE FUNCTION sync_feature_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feature_posts SET vote_count = vote_count + 1 WHERE id = NEW.feature_post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feature_posts SET vote_count = vote_count - 1 WHERE id = OLD.feature_post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feature_votes_sync
  AFTER INSERT OR DELETE ON feature_votes
  FOR EACH ROW EXECUTE FUNCTION sync_feature_vote_count();

-- Auto-sync comment count
CREATE OR REPLACE FUNCTION sync_feature_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feature_posts SET comment_count = comment_count + 1 WHERE id = NEW.feature_post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feature_posts SET comment_count = comment_count - 1 WHERE id = OLD.feature_post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feature_comments_sync
  AFTER INSERT OR DELETE ON feature_comments
  FOR EACH ROW EXECUTE FUNCTION sync_feature_comment_count();

-- RLS
ALTER TABLE feature_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fp_select" ON feature_posts FOR SELECT USING (true);
CREATE POLICY "fv_select" ON feature_votes FOR SELECT USING (true);
CREATE POLICY "fv_insert" ON feature_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "fv_delete" ON feature_votes FOR DELETE USING (true);
CREATE POLICY "fc_select" ON feature_comments FOR SELECT USING (true);
CREATE POLICY "fc_insert" ON feature_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "sl_select" ON sync_logs FOR SELECT USING (true);
