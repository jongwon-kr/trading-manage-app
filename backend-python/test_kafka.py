from confluent_kafka import Consumer, Producer
import json

# Producer 테스트
print("=" * 50)
print("Kafka Producer 테스트")
print("=" * 50)

try:
    producer = Producer({'bootstrap.servers': 'localhost:9092'})
    producer.produce('test-topic', value=json.dumps({"test": "message"}).encode('utf-8'))
    producer.flush()
    print("✅ Producer 테스트 성공!")
except Exception as e:
    print(f"❌ Producer 테스트 실패: {e}")

# Consumer 테스트
print("\n" + "=" * 50)
print("Kafka Consumer 테스트")
print("=" * 50)

try:
    consumer = Consumer({
        'bootstrap.servers': 'localhost:9092',
        'group.id': 'test-group',
        'auto.offset.reset': 'earliest'
    })
    consumer.subscribe(['test-topic'])
    print("✅ Consumer 연결 성공!")
    
    print("메시지 대기 중 (5초)...")
    msg = consumer.poll(timeout=5.0)
    
    if msg is None:
        print("⚠ 메시지 없음")
    elif msg.error():
        print(f"❌ Consumer 오류: {msg.error()}")
    else:
        print(f"✅ 메시지 수신: {msg.value().decode('utf-8')}")
    
    consumer.close()
    
except Exception as e:
    print(f"❌ Consumer 테스트 실패: {e}")

print("\n" + "=" * 50)
print("테스트 완료")
print("=" * 50)
