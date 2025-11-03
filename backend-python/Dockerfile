# 가볍고 공식적인 python 3.11-slim 이미지를 기반으로 함
FROM python:3.11-slim
WORKDIR /app

# 1. 의존성(라이브러리) 먼저 설치 (빌드 캐시 활용)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2. 나머지 소스코드 복사
COPY . .

# 8000번 포트 개방
EXPOSE 8000

# uvicorn 서버 실행 (main.py 파일의 app 객체)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]