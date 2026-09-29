-- 커뮤니티: 게시글·댓글(기존 엔티티, prod 에는 테이블이 없었음)·좋아요
-- local 은 ddl-auto:update 로 자동 반영, prod(validate)는 배포 전 1회 실행
CREATE TABLE IF NOT EXISTS content (
    content_id      BIGSERIAL PRIMARY KEY,
    category        VARCHAR(255) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    content         TEXT,
    author_email    VARCHAR(255) NOT NULL,
    view_count      INTEGER      NOT NULL DEFAULT 0,
    is_deleted      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP(6),
    updated_at      TIMESTAMP(6)
);
ALTER TABLE content ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(16) NOT NULL DEFAULT 'NONE';
ALTER TABLE content ADD COLUMN IF NOT EXISTS attachment      TEXT;
ALTER TABLE content ADD COLUMN IF NOT EXISTS symbol_key      VARCHAR(64);
ALTER TABLE content ADD COLUMN IF NOT EXISTS metric_return   DOUBLE PRECISION;
ALTER TABLE content ADD COLUMN IF NOT EXISTS metric_mdd      DOUBLE PRECISION;
ALTER TABLE content ADD COLUMN IF NOT EXISTS like_count      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE content ADD COLUMN IF NOT EXISTS comment_count   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE content ADD COLUMN IF NOT EXISTS import_count    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE content ADD COLUMN IF NOT EXISTS hidden          BOOLEAN NOT NULL DEFAULT FALSE;
-- Hibernate 가 만든 enum CHECK 제약은 ddl-auto:update 가 갱신하지 않는다 → 새 카테고리(공유 글)를 허용하도록 다시 만든다
ALTER TABLE content DROP CONSTRAINT IF EXISTS content_category_check;
ALTER TABLE content ADD CONSTRAINT content_category_check CHECK (category IN
    ('NOTICE', 'FREE_BOARD', 'JOURNAL_SHARE', 'STRATEGY_SHARE', 'QNA', 'FAQ', 'GALLERY'));
CREATE INDEX IF NOT EXISTS idx_content_category_created ON content (category, created_at);
CREATE INDEX IF NOT EXISTS idx_content_author_email ON content (author_email);
CREATE INDEX IF NOT EXISTS idx_content_symbol_key ON content (symbol_key);

CREATE TABLE IF NOT EXISTS comment (
    comment_id   BIGSERIAL PRIMARY KEY,
    content_id   BIGINT       NOT NULL REFERENCES content (content_id),
    author_email VARCHAR(255) NOT NULL,
    comment      TEXT         NOT NULL,
    is_deleted   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP(6),
    updated_at   TIMESTAMP(6)
);
ALTER TABLE comment ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS content_like (
    content_like_id BIGSERIAL PRIMARY KEY,
    content_id      BIGINT       NOT NULL,
    user_email      VARCHAR(255) NOT NULL,
    created_at      TIMESTAMP(6),
    updated_at      TIMESTAMP(6),
    CONSTRAINT uk_content_like UNIQUE (content_id, user_email)
);
CREATE INDEX IF NOT EXISTS idx_content_like_user ON content_like (user_email);
