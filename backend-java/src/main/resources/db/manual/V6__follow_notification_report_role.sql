-- 팔로우·알림·신고, 사용자 권한(role)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(16) NOT NULL DEFAULT 'USER';
-- 관리자 지정 (예시): UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';

CREATE TABLE IF NOT EXISTS follow (
    follow_id      BIGSERIAL PRIMARY KEY,
    follower_email VARCHAR(255) NOT NULL,
    followee_email VARCHAR(255) NOT NULL,
    created_at     TIMESTAMP(6),
    updated_at     TIMESTAMP(6),
    CONSTRAINT uk_follow UNIQUE (follower_email, followee_email)
);
CREATE INDEX IF NOT EXISTS idx_follow_followee ON follow (followee_email);

CREATE TABLE IF NOT EXISTS notification (
    notification_id BIGSERIAL PRIMARY KEY,
    recipient_email VARCHAR(255) NOT NULL,
    type            VARCHAR(32)  NOT NULL,
    actor_name      VARCHAR(100),
    content_id      BIGINT,
    message         VARCHAR(300),
    is_read         BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP(6),
    updated_at      TIMESTAMP(6)
);
CREATE INDEX IF NOT EXISTS idx_notification_recipient ON notification (recipient_email, is_read);

CREATE TABLE IF NOT EXISTS report (
    report_id      BIGSERIAL PRIMARY KEY,
    target_type    VARCHAR(16)  NOT NULL,
    target_id      BIGINT       NOT NULL,
    content_id     BIGINT       NOT NULL,
    reporter_email VARCHAR(255) NOT NULL,
    reason         VARCHAR(32)  NOT NULL,
    memo           VARCHAR(500),
    status         VARCHAR(16)  NOT NULL,
    resolved_by    VARCHAR(255),
    created_at     TIMESTAMP(6),
    updated_at     TIMESTAMP(6),
    CONSTRAINT uk_report UNIQUE (target_type, target_id, reporter_email)
);
CREATE INDEX IF NOT EXISTS idx_report_status ON report (status);
