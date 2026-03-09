ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_post_type_check;

ALTER TABLE posts ADD CONSTRAINT posts_post_type_check
  CHECK (post_type IN (
    'vibe_coding', 'ai', 'news', 'showcase', 'resource', 'question', 'free',
    'proposal', 'feature', 'bug', 'community'
  ));
