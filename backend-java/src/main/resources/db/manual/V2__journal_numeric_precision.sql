-- Journal 숫자 컬럼 정밀도 확장 (기존: Hibernate 기본 numeric(38,2) → 암호화폐 수량이 소수 2자리로 잘림)
-- ddl-auto(update/validate)는 기존 컬럼 타입을 변경하지 않으므로 기존 DB 에는 수동으로 1회 실행한다.
ALTER TABLE journal
    ALTER COLUMN quantity        TYPE numeric(30, 10),
    ALTER COLUMN entry_price     TYPE numeric(24, 8),
    ALTER COLUMN stop_loss_price TYPE numeric(24, 8),
    ALTER COLUMN realized_pnl    TYPE numeric(24, 8);
