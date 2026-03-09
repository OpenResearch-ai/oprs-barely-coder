-- =========================================
-- OpenResearch Community Schema
-- =========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================
-- Posts (community posts, feature requests, bug reports)
-- =========================================
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT 'anonymous',
  author_avatar TEXT,
  tags TEXT[] DEFAULT '{}',
  -- 'community' | 'feature' | 'bug' | 'question'
  post_type TEXT NOT NULL DEFAULT 'community'
    CHECK (post_type IN ('community', 'feature', 'bug', 'question')),
  -- 'oo.ai' | 'o talk' | 'platform' | null
  product TEXT CHECK (product IN ('oo.ai', 'o talk', 'platform')),
  upvote_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  -- which sprint picked this up (nullable until sprint runs)
  sprint_id UUID,
  locale TEXT NOT NULL DEFAULT 'ko',
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posts_created_at ON posts (created_at DESC);
CREATE INDEX idx_posts_upvote_count ON posts (upvote_count DESC);
CREATE INDEX idx_posts_post_type ON posts (post_type);
CREATE INDEX idx_posts_product ON posts (product);

-- =========================================
-- Votes (one vote per user per post)
-- =========================================
CREATE TABLE votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX idx_votes_post_id ON votes (post_id);
CREATE INDEX idx_votes_user_id ON votes (user_id);

-- =========================================
-- Comments
-- =========================================
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT 'anonymous',
  author_avatar TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_post_id ON comments (post_id);

-- =========================================
-- Sprints (weekly)
-- =========================================
CREATE TABLE sprints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_label TEXT NOT NULL,        -- e.g. "2025 W10"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  -- 'draft' | 'active' | 'completed'
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'completed')),
  -- AI-generated summary of why these items were chosen
  ai_summary TEXT,
  -- raw stats for transparency
  total_posts_analyzed INTEGER DEFAULT 0,
  total_votes_counted INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,        -- when owner confirmed the sprint
  UNIQUE (week_label)
);

-- Add FK from posts to sprints (after sprints table exists)
ALTER TABLE posts ADD CONSTRAINT fk_posts_sprint
  FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE SET NULL;

-- =========================================
-- Sprint Items (AI-generated from community posts)
-- =========================================
CREATE TABLE sprint_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  -- 'planned' | 'in_progress' | 'done'
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'in_progress', 'done')),
  product TEXT CHECK (product IN ('oo.ai', 'o talk', 'platform')),
  -- AI-assigned priority (1 = highest)
  priority INTEGER NOT NULL DEFAULT 99,
  -- IDs of community posts that inspired this item
  source_post_ids UUID[] DEFAULT '{}',
  -- vote score from source posts (sum)
  community_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sprint_items_sprint_id ON sprint_items (sprint_id);
CREATE INDEX idx_sprint_items_status ON sprint_items (status);

-- =========================================
-- Auto-update updated_at on posts
-- =========================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =========================================
-- Auto-sync vote counts on posts
-- =========================================
CREATE OR REPLACE FUNCTION sync_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET upvote_count = upvote_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET upvote_count = upvote_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER votes_sync_count
  AFTER INSERT OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION sync_vote_count();

-- =========================================
-- Auto-sync comment counts on posts
-- =========================================
CREATE OR REPLACE FUNCTION sync_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comments_sync_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION sync_comment_count();

-- =========================================
-- Row Level Security
-- =========================================
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprint_items ENABLE ROW LEVEL SECURITY;

-- Posts: anyone can read, authed users can create
CREATE POLICY "posts_select" ON posts FOR SELECT USING (true);
CREATE POLICY "posts_insert" ON posts FOR INSERT
  WITH CHECK (auth.uid() = author_id OR author_id IS NULL);
CREATE POLICY "posts_update" ON posts FOR UPDATE
  USING (auth.uid() = author_id);
CREATE POLICY "posts_delete" ON posts FOR DELETE
  USING (auth.uid() = author_id);

-- Votes: anyone can read, authed users can vote
CREATE POLICY "votes_select" ON votes FOR SELECT USING (true);
CREATE POLICY "votes_insert" ON votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "votes_delete" ON votes FOR DELETE
  USING (auth.uid() = user_id);

-- Comments: anyone can read, authed users can create
CREATE POLICY "comments_select" ON comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON comments FOR INSERT
  WITH CHECK (auth.uid() = author_id OR author_id IS NULL);
CREATE POLICY "comments_delete" ON comments FOR DELETE
  USING (auth.uid() = author_id);

-- Sprints & sprint items: public read only
CREATE POLICY "sprints_select" ON sprints FOR SELECT USING (true);
CREATE POLICY "sprint_items_select" ON sprint_items FOR SELECT USING (true);
