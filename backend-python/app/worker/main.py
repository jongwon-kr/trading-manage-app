import logging
import threading
import sys
from confluent_kafka.admin import AdminClient, NewTopic
from app.worker.kafka_consumer import KafkaConsumerService
from app.worker.handler import AnalysisHandler
from app.config import settings

# 1. 로깅 설정을 Python 기본 logging.basicConfig로 변경합니다.
# 이렇게 하면 루트 로거가 설정되어 모든 모듈에서 동일한 포맷을 사용합니다.
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)  # 로그를 콘솔(stdout)로 출력
    ]
)
logger = logging.getLogger(__name__)

def ensure_topics(topics: list[str]):
    """구독할 토픽이 없으면 생성한다.
    (토픽이 없는 상태로 구독하면 librdkafka 가 메타데이터 갱신 주기(기본 5분)까지 메시지를 받지 못한다)"""
    admin = AdminClient({'bootstrap.servers': settings.KAFKA_BOOTSTRAP_SERVERS})
    existing = set(admin.list_topics(timeout=10).topics)
    missing = [NewTopic(t, num_partitions=1, replication_factor=1) for t in topics if t not in existing]
    if not missing:
        return
    for topic, future in admin.create_topics(missing).items():
        try:
            future.result()
            logger.info(f"토픽 생성 완료: {topic}")
        except Exception as e:
            logger.warning(f"토픽 생성 실패(이미 존재할 수 있음): {topic}, {e}")

def start_consumer(topic: str, handler: callable):
    """지정된 토픽에 대한 Kafka Consumer를 시작"""
    try:
        logger.info(f"Consumer 스레드 시작 중: topic={topic}")
        consumer = KafkaConsumerService(topic, handler)
        consumer.start_consuming()
    except Exception as e:
        logger.error(f"Consumer (topic: {topic}) 시작 실패: {e}", exc_info=True)
    finally:
        logger.warning(f"Consumer (topic: {topic}) 종료됨.")

if __name__ == "__main__":
    logger.info("========================================")
    logger.info("  Python 분석 서비스 (Kafka Consumer) 시작 ")
    logger.info("========================================")
    
    # 1. 모든 요청을 처리할 단일 핸들러 인스턴스 생성
    analysis_handler = AnalysisHandler()
    handler_function = analysis_handler.handle_analysis_request

    # 2. settings.py에 정의된 각 토픽에 대한 Consumer 스레드 생성
    topics = [
        settings.CHART_ANALYSIS_REQUEST_TOPIC,
        settings.MARKET_TREND_REQUEST_TOPIC,
        settings.NEWS_ANALYSIS_REQUEST_TOPIC,
        settings.BACKTEST_REQUEST_TOPIC
    ]
    
    ensure_topics([t for t in topics if t])

    threads = []
    
    for topic in topics:
        if not topic:
            logger.warning("설정에 토픽 이름이 비어있습니다. 건너뜁니다.")
            continue
            
        t = threading.Thread(target=start_consumer, args=(topic, handler_function))
        t.daemon = True  # 메인 스레드 종료 시 함께 종료
        threads.append(t)
        
    # 3. 모든 스레드 시작
    for t in threads:
        t.start()
        
    logger.info(f"총 {len(threads)}개의 Consumer 스레드 시작 완료. 메시지 대기 중...")

    # 메인 스레드가 종료되지 않도록 대기 (KeyboardInterrupt로 종료 가능)
    try:
        # 모든 Consumer 스레드가 종료될 때까지 대기
        for t in threads:
            t.join()
            
    except KeyboardInterrupt:
        logger.info("서비스 종료 요청 (KeyboardInterrupt)...")
    except Exception as e:
        logger.error(f"메인 스레드 오류 발생: {e}", exc_info=True)
    finally:
        logger.info("모든 Consumer 스레드 종료. 서비스 종료.")