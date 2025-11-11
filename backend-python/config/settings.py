import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()

@dataclass
class Settings:
    #kafka
    KAFKA_BOOTSTRAP_SERVERS: str = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    KAFKA_CONSUMER_GROUP_ID: str = os.getenv("KAFKA_CONSUMER_GROUP_ID", "tbill-python-group")
    
    # Redis
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_PASSWORD: str = os.getenv("REDIS_PASSWORD", "1234")
    
    # Kafka Topics
    CHART_ANALYSIS_REQUEST_TOPIC: str = "chart-analysis-request"
    MARKET_TREND_REQUEST_TOPIC: str = "market-trend-request"
    NEWS_ANALYSIS_REQUEST_TOPIC: str = "news-analysis-request"
    BACKTEST_REQUEST_TOPIC: str = "backtest-request"
    ANALYSIS_RESPONSE_TOPIC: str = "analysis-response"
    
    # Analysis
    ANALYSIS_RESULT_TTL: int = 3600  # 1시간

settings = Settings()