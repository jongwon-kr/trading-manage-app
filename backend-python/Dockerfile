FROM python:3.14-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# 1. 의존성 먼저 설치 (빌드 캐시 활용)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2. 소스코드 복사
COPY app ./app

EXPOSE 8000

# 기본은 시세 API. worker/stream 은 compose·k8s 에서 command 로 덮어쓴다:
#   python -m app.worker.main   (Kafka 분석 consumer)
#   python -m app.stream.main   (Upbit 실시간 시세, 반드시 1개 replica)
CMD ["uvicorn", "app.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
