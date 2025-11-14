import json
import uuid
from datetime import datetime
from confluent_kafka import Producer
from config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def delivery_report(err, msg):
    """ Called once for each message produced to indicate delivery result. """
    if err is not None:
        logger.error(f"메시지 전송 실패: {err}")
    else:
        logger.info(f"메시지 전송 성공: Topic={msg.topic()}, Partition={msg.partition()}, Offset={msg.offset()}")

def send_kafka_message(producer: Producer, topic: str, message: dict):
    """ Kafka 토픽으로 메시지를 JSON 형태로 전송 """
    try:
        # 메시지를 JSON 문자열로 직렬화
        value = json.dumps(message)
        
        # 메시지 전송
        producer.produce(
            topic, 
            value.encode('utf-8'), 
            callback=delivery_report
        )
        logger.info(f"메시지 전송 요청: topic={topic}, message={value}")
        
    except Exception as e:
        logger.error(f"메시지 전송 중 오류: {e}", exc_info=True)

if __name__ == "__main__":
    
    # Kafka Producer 설정
    conf = {
        'bootstrap.servers': settings.KAFKA_BOOTSTRAP_SERVERS,
        # 필요한 경우 추가 인증 설정
    }
    
    producer = Producer(conf)
    
    # --- 테스트 1: 기술적 분석 (TECHNICAL) ---
    request_id_1 = str(uuid.uuid4())
    technical_message = {
      "requestId": request_id_1,
      "userEmail": "test@example.com",
      "analysisType": "TECHNICAL",
      "symbol": "AAPL",
      "timeframe": "1d",
      "requestedAt": datetime.now().isoformat()
    }
    
    send_kafka_message(
        producer, 
        settings.CHART_ANALYSIS_REQUEST_TOPIC, 
        technical_message
    )

    # --- 테스트 2: 시장 트렌드 분석 (MARKET_TREND) ---
    # (2.1에서 연결한 핸들러 테스트용)
    request_id_2 = str(uuid.uuid4())
    market_message = {
      "requestId": request_id_2,
      "userEmail": "test@example.com",
      "analysisType": "MARKET_TREND",
      "market": "STOCK", # "CRYPTO", "FOREX" 등
      "requestedAt": datetime.now().isoformat()
    }
    
    send_kafka_message(
        producer, 
        settings.MARKET_TREND_REQUEST_TOPIC, 
        market_message
    )

    # 모든 메시지가 전송될 때까지 대기
    producer.flush()
    logger.info("모든 메시지 전송 완료.")