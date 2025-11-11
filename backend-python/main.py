from fastapi import FastAPI
import threading
import logging
import time
from config import settings
from services.kafka_consumer import KafkaConsumerService
from services.analysis_handler import AnalysisHandler

# 로깅 설정 강화
logging.basicConfig(
    level=logging.DEBUG,  # DEBUG로 변경
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Trading Analysis API")

# Global variables
analysis_handler = None
consumer_thread = None

@app.get("/")
def read_root():
    return {
        "message": "Python Quant Analysis API Server",
        "status": "running",
        "consumer_status": "running" if consumer_thread and consumer_thread.is_alive() else "stopped",
        "consumer_thread_name": consumer_thread.name if consumer_thread else None,
        "kafka_bootstrap": settings.KAFKA_BOOTSTRAP_SERVERS,
        "kafka_topics": {
            "chart_analysis": settings.CHART_ANALYSIS_REQUEST_TOPIC,
        }
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "consumer_active": consumer_thread and consumer_thread.is_alive()
    }

def start_kafka_consumer():
    """Kafka Consumer 시작 함수"""
    logger.info("🚀 Kafka Consumer 스레드 함수 시작")
    
    try:
        chart_consumer = KafkaConsumerService(
            topic=settings.CHART_ANALYSIS_REQUEST_TOPIC,
            message_handler=analysis_handler.handle_analysis_request
        )
        
        logger.info("✅ KafkaConsumerService 인스턴스 생성 완료")
        logger.info("🔄 메시지 소비 시작...")
        
        chart_consumer.start_consuming()
        
    except Exception as e:
        logger.error(f"❌ Kafka Consumer 실행 중 오류: {e}", exc_info=True)

@app.on_event("startup")
async def startup_event():
    """애플리케이션 시작 시 Kafka Consumer 실행"""
    global analysis_handler, consumer_thread
    
    logger.info("=" * 60)
    logger.info("🚀 애플리케이션 시작")
    logger.info("=" * 60)
    
    # Analysis Handler 초기화
    logger.info("📊 AnalysisHandler 초기화 중...")
    analysis_handler = AnalysisHandler()
    logger.info("✅ AnalysisHandler 초기화 완료")
    
    # Kafka 설정 확인
    logger.info(f"🔧 Kafka Bootstrap Servers: {settings.KAFKA_BOOTSTRAP_SERVERS}")
    logger.info(f"🔧 Kafka Consumer Group: {settings.KAFKA_CONSUMER_GROUP_ID}")
    logger.info(f"🔧 Kafka Topic: {settings.CHART_ANALYSIS_REQUEST_TOPIC}")
    
    # Consumer 스레드 시작
    logger.info("🎬 Kafka Consumer 스레드 생성 중...")
    consumer_thread = threading.Thread(
        target=start_kafka_consumer,
        daemon=True,
        name="KafkaConsumerThread"
    )
    consumer_thread.start()
    
    logger.info(f"✅ Consumer 스레드 시작됨: {consumer_thread.name}")
    
    # 스레드 시작 확인
    time.sleep(1)
    if consumer_thread.is_alive():
        logger.info("✅ Consumer 스레드 정상 실행 중!")
    else:
        logger.error("❌ Consumer 스레드가 즉시 종료됨!")
    
    logger.info("=" * 60)

@app.on_event("shutdown")
async def shutdown_event():
    """애플리케이션 종료"""
    logger.info("애플리케이션 종료 중...")

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Uvicorn server...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
