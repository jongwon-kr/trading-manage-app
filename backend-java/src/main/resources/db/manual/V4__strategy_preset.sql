-- 사용자 전략 프리셋 (local 은 ddl-auto:update 로 자동 생성, prod(validate)는 배포 전 1회 실행)
CREATE TABLE IF NOT EXISTS strategy_preset (
    strategy_preset_id  BIGSERIAL PRIMARY KEY,
    user_email          VARCHAR(255) NOT NULL,
    name                VARCHAR(50)  NOT NULL,
    description         VARCHAR(500),
    config              TEXT         NOT NULL,
    config_hash         VARCHAR(32)  NOT NULL,
    forked_from_post_id BIGINT,
    created_at          TIMESTAMP(6),
    updated_at          TIMESTAMP(6),
    CONSTRAINT uk_strategy_preset_user_name UNIQUE (user_email, name)
);
CREATE INDEX IF NOT EXISTS idx_strategy_preset_user_email ON strategy_preset (user_email);
