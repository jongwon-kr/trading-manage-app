from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """환경변수(.env 포함)에서 읽는 서비스 설정. 기본값은 docker-compose 로컬 환경 기준."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_CONSUMER_GROUP_ID: str = "tbill-python-group"

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = "1234"

    # Java → Python 내부 API 인증 토큰 (X-Internal-Token 헤더)
    INTERNAL_TOKEN: str = "local-dev-token"

    # Kafka Topics (backend-java KafkaTopics.java 와 반드시 동기화)
    CHART_ANALYSIS_REQUEST_TOPIC: str = "chart-analysis-request"
    STRATEGY_ANALYSIS_REQUEST_TOPIC: str = "strategy-analysis-request"
    MARKET_TREND_REQUEST_TOPIC: str = "market-trend-request"
    NEWS_ANALYSIS_REQUEST_TOPIC: str = "news-analysis-request"
    BACKTEST_REQUEST_TOPIC: str = "backtest-request"

    # Analysis
    ANALYSIS_RESULT_TTL: int = 3600  # 1시간
    BACKTEST_RESULT_TTL: int = 86400  # 24시간


settings = Settings()
