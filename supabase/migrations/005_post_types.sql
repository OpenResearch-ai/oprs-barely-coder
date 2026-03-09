-- Add new post types
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_post_type_check;

ALTER TABLE posts ADD CONSTRAINT posts_post_type_check
  CHECK (post_type IN (
    'community',   -- 일반 토론
    'feature',     -- 기능 요청
    'bug',         -- 버그 리포트
    'question',    -- 질문
    'proposal',    -- 새 서비스 제안
    'showcase',    -- 만든 것 자랑
    'resource'     -- 유용한 링크/자료
  ));
