-- 관심종목 테이블 (local 은 ddl-auto:update 로 자동 생성, prod(validate)는 배포 전 1회 실행)
CREATE TABLE IF NOT EXISTS watchlist_item (
    watchlist_item_id BIGSERIAL PRIMARY KEY,
    user_email        VARCHAR(255) NOT NULL,
    market            VARCHAR(16)  NOT NULL,
    code              VARCHAR(32)  NOT NULL,
    name              VARCHAR(100) NOT NULL,
    sort_order        INTEGER      NOT NULL,
    created_at        TIMESTAMP(6),
    updated_at        TIMESTAMP(6),
    CONSTRAINT uk_watchlist_user_symbol UNIQUE (user_email, market, code)
);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_email ON watchlist_item (user_email);
