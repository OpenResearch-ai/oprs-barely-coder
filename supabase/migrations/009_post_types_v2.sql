-- Add vibe_coding and ai as proper post types
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_post_type_check;

ALTER TABLE posts ADD CONSTRAINT posts_post_type_check
  CHECK (post_type IN (
    'vibe_coding',  -- 바이브 코딩 경험/팁
    'ai',           -- AI/LLM 일반 토론
    'showcase',     -- 만든 것 자랑
    'resource',     -- 유용한 링크/자료
    'question',     -- 질문
    'proposal',     -- 새 서비스 제안
    'feature',      -- 기능 요청
    'bug',          -- 버그 신고
    'community'     -- 기타 (레거시용)
  ));
