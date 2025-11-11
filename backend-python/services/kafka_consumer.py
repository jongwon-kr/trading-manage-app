from confluent_kafka import Consumer, KafkaException
import json
import logging
from typing import Callable
from config import settings

logger = logging.getLogger(__name__)

class KafkaConsumerService:
    def __init__(self, topic: str, message_handler: Callable):
        """
        Kafka Consumer 초기화 (confluent-kafka 사용)
        
        Args:
            topic: 구독할 토픽
            message_handler: 메시지 처리 함수
        """
        self.topic = topic
        self.message_handler = message_handler
        
        conf = {
            'bootstrap.servers': settings.KAFKA_BOOTSTRAP_SERVERS,
            'group.id': settings.KAFKA_CONSUMER_GROUP_ID,
            'auto.offset.reset': 'earliest',
            'enable.auto.commit': True,
            'session.timeout.ms': 6000
        }
        
        self.consumer = Consumer(conf)
        self.consumer.subscribe([topic])
        
        logger.info(f"Kafka Consumer 초기화 완료: topic={topic}, group_id={settings.KAFKA_CONSUMER_GROUP_ID}")

    def start_consuming(self):
        """메시지 소비 시작"""
        logger.info(f"Kafka Consumer 시작: topic={self.topic}")
        
        try:
            while True:
                msg = self.consumer.poll(timeout=1.0)
                
                if msg is None:
                    continue
                
                if msg.error():
                    logger.error(f"Consumer error: {msg.error()}")
                    continue
                
                try:
                    # 메시지 파싱
                    value = json.loads(msg.value().decode('utf-8'))
                    
                    logger.info(f"메시지 수신: topic={msg.topic()}, partition={msg.partition()}, offset={msg.offset()}")
                    
                    # 메시지 처리
                    self.message_handler(value)
                    
                except Exception as e:
                    logger.error(f"메시지 처리 중 오류: {e}", exc_info=True)
                    
        except KeyboardInterrupt:
            logger.info("Kafka Consumer 중단")
        finally:
            self.consumer.close()
            logger.info("Kafka Consumer 종료")

    def close(self):
        """Consumer 종료"""
        self.consumer.close()
