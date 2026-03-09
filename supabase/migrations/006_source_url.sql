-- Add source URL for external content (crawled posts, link submissions)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_bot_post BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_posts_source_url ON posts (source_url) WHERE source_url IS NOT NULL;
