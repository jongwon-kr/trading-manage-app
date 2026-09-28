# backend-python

하나의 패키지(`app/`)를 세 가지 프로세스로 실행한다.

| 엔트리포인트 | 역할 |
|---|---|
| `uvicorn app.api.main:app --port 8000` | 시세 조회 내부 API (Java 만 호출, `X-Internal-Token`) |
| `python -m app.worker.main` | Kafka 분석 요청 consumer → 결과를 Redis `analysis:{requestId}` 에 기록 |
| `python -m app.stream.main` | Upbit WebSocket 실시간 시세 → Redis pub/sub (반드시 1개만 실행) |

## 로컬 실행

```bash
python -m venv .venv
.venv/Scripts/pip install -r requirements-dev.txt
.venv/Scripts/python -m uvicorn app.api.main:app --port 8000
.venv/Scripts/python -m app.worker.main
.venv/Scripts/python -m pytest
```

Windows 에서 로그 한글이 깨지면 `PYTHONUTF8=1` 을 설정한다.
