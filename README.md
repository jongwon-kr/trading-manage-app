# tbill — 시세·차트·정량 전략 분석 & 매매일지

국내주식·미국주식·암호화폐의 시세와 차트를 한 화면에서 보고, **기본적·기술적·시장 국면 지표를 0~100 점수로 수치화한 전략 분석**과 **백테스트**로 매매 판단을 돕는 서비스. 최종 목표는 신호 제공 → 모의투자 → 소액 자동매매로의 확장이다.

| 대상 시장 | 데이터 소스 (전부 무료) | 갱신 |
|---|---|---|
| 국내주식 (KOSPI·KOSDAQ) | FinanceDataReader, pykrx, 네이버 금융 | 장중 20초~1분 |
| 미국주식 (NYSE·NASDAQ) | yfinance, NASDAQ Trader | 장중 20초~1분 (일부 지연 시세) |
| 암호화폐 (Upbit KRW 마켓) | Upbit 공개 REST·WebSocket | **실시간** (1초) |

> 본 서비스의 분석 결과는 투자 참고용이며 투자 판단과 책임은 이용자에게 있다.

![대시보드](docs/images/dashboard.png)

---

## 목차

1. [기능과 사용 방법](#기능과-사용-방법)
2. [로컬 실행](#로컬-실행)
3. [구성](#구성)
4. [전략 점수 모델](#전략-점수-모델)
5. [API](#api)
6. [테스트](#테스트)
7. [알려진 문제](#알려진-문제)
8. [로드맵](#로드맵)
9. [README 스크린샷 갱신](#readme-스크린샷-갱신)

---

## 기능과 사용 방법

### 1. 로그인 · 회원가입

`/register` 에서 닉네임(중복 확인)·이메일·비밀번호로 가입하고 `/login` 에서 로그인한다. 로그인 전에 열었던 주소(예: 종목 상세 딥링크)가 있으면 로그인 후 그 화면으로 돌아간다. 세션은 30분이며 사이드바 하단 타이머의 새로고침 버튼으로 연장한다.

![로그인](docs/images/login.png)

### 2. 대시보드 — `/dashboard`

로그인 직후 보이는 요약 화면.

- **주요 지수**: 코스피·코스닥·S&P 500·나스닥·원/달러·비트코인과 최근 30일 추세선
- **관심종목**: 상위 10개. 주식은 장중 주기 갱신, 코인은 실시간. 행을 누르면 종목 상세로 이동
- **시장 국면**: 시장별 0~100 점수 (지수 추세·변동성·시장 폭/심리) — [전략 점수 모델](#전략-점수-모델)의 시장 국면 그룹과 같은 계산
- **매매 일지 요약**: 총 거래·진행 중·승률·누적 실현손익

### 3. 시장 — `/market`

- 상단: 지수 카드 8개(VIX·이더리움 포함), 시장별 개장/마감, 코인 공포·탐욕 지수, BTC 도미넌스
- 하단 탭(국내주식·미국주식·암호화폐): **상승률 / 하락률 / 거래대금(미국은 거래량) 상위 10**. 행을 누르면 종목 상세로 이동

![시장](docs/images/market.png)

### 4. 종목 검색 — 헤더 `종목 검색` 버튼 또는 `Ctrl + K`

종목명(한글·영문)이나 코드로 검색한다. `삼성`, `AAPL`, `비트`, `btc` 모두 된다. 칩으로 시장을 좁힐 수 있고, 선택하면 종목 상세로 이동한다.

![종목 검색](docs/images/search.png)

### 5. 종목 상세 — `/market/{kr|us|crypto}/{코드}`

예: `/market/kr/005930`, `/market/us/AAPL`, `/market/crypto/KRW-BTC`. 주소를 그대로 공유·새로고침할 수 있다.

- **시세 헤더**: 현재가·등락, 시가/고가/저가/전일/거래량/거래대금, `지연 시세` 배지(해당 시)
- **관심 추가 ★**: 헤더 오른쪽 버튼으로 관심종목 추가/삭제
- **차트** (TradingView lightweight-charts)
  - 주기 버튼: 국내 `5분~월`, 미국·코인 `1분~월` (국내 분봉은 yfinance 지연 데이터, 최근 60일)
  - `지표` 메뉴: 이동평균 20/60/120, 볼린저 밴드, 거래량, RSI, MACD — 선택은 브라우저에 저장된다
  - 마우스를 올리면 좌상단에 시/고/저/종/거래량 표시, 드래그·휠로 이동·확대
  - 전략 분석 결과의 **진입·손절·목표1·목표2 가격선**이 차트에 그려진다
- **전략 분석 카드**: 페이지를 열면 자동 분석된다. 점수·신호·신뢰도와 매매 계획(진입 구간, 손절가, 1.5R/3R 목표, 추적 손절, 권장 비중). `다시 분석` 으로 재계산
- **재무 지표** (주식): PER, PBR, ROE, 영업이익률, 부채비율, 배당수익률, EPS·매출 성장률, 시가총액
- **내 매매기록**: 이 종목의 매매일지가 있으면 표시

![종목 상세](docs/images/symbol-detail.png)

#### 전략 분석 리포트

종목 상세 하단(`상세 리포트 보기 ↓`)에서 점수가 왜 그렇게 나왔는지 확인한다.

- **점수 게이지**: 0 매도 ← 50 중립 → 100 매수. 신호 5단계(강한 매도 ≤25 · 매도 ≤40 · 관망 · 매수 ≥60 · 강한 매수 ≥75)
- **그룹 점수**: 기술적·기본적·시장 국면 각각의 0~100 점수, 실효 비중, 데이터 커버리지
- **팩터별 기여도**: 50점(중립)에 각 팩터 기여도를 더한 값이 종합 점수. 빨강은 점수를 올린 요인, 파랑은 내린 요인
- **팩터 상세**: 팩터별 점수(-1~1)와 근거 원시값
- **경고**: 시장 위험회피 국면, 60일 고점(저항)이 1R 이내, 업비트 투자유의 종목 등

![전략 분석 리포트](docs/images/strategy-report.png)

#### 코인 실시간 · 다크 모드

코인 종목은 업비트 체결이 **1초 단위로 가격과 차트의 현재 봉에 반영**된다(헤더에 `● 실시간` 배지). 연결이 끊기면 자동 재연결하고 끊긴 동안의 봉을 다시 받는다. 헤더의 해/달 아이콘으로 라이트·다크 테마를 바꾼다(기본값은 OS 설정).

![코인 실시간(다크 모드)](docs/images/crypto-realtime-dark.png)

### 6. 전략 분석 — `/analysis`

종목 하나를 골라 옵션과 함께 분석한다.

1. `종목 선택` → 검색 창에서 종목 선택 (주소가 `/analysis?market=us&symbol=AAPL` 처럼 바뀌어 공유 가능)
2. (선택) `계좌 금액` 입력 → 계좌 대비 **권장 수량**까지 계산
3. `1회 위험 비율`(0.5% / 1% / 2%) 선택 → 손절 시 계좌 손실이 이 비율이 되도록 비중을 계산
4. `분석 실행`

상단의 **시장 국면 카드**로 국내·미국·코인 시장 전체의 분위기를 먼저 확인할 수 있다. 결과에는 가격선이 그려진 일봉 차트와 전체 리포트가 나온다.

![전략 분석](docs/images/analysis.png)

### 7. 백테스트 — `/backtest`

전략 점수로 과거에 매매했다면 어땠는지 검증한다.

1. `종목 선택`, `시작일`·`종료일` (기본: 최근 3년)
2. `진입 점수 ≥`(기본 60) / `청산 점수 ≤`(기본 45): 두 값의 차이가 잦은 매매를 막는다
3. `손절 ATR 배수`(주식 2.0, 코인 2.5), `목표 R 배수`(3), `초기 자본`
4. `백테스트 실행` → 수 초 안에 결과

결과 화면:

- 요약: 총 수익률, 연환산 수익률(CAGR), 최대 낙폭(MDD), **단순 보유 대비** 초과 수익
- 자산 곡선(전략 vs 보유)과 낙폭, 성과 지표 비교표(샤프·승률·손익비·평균 보유 기간·노출도)
- 매매 시점 차트(▲매수 ▼청산 사유)와 거래 내역

체결 규칙: 종가 신호 → 다음 날 시가 체결, 같은 날 손절과 목표를 모두 건드리면 손절로 처리(보수적), 수수료·세금·슬리피지 반영. **기본적 분석과 시장 폭·심리 지표는 과거 시점 데이터가 없어 백테스트에서 제외**된다(미래 정보 사용 방지). 과거 성과는 미래 수익을 보장하지 않는다.

![백테스트](docs/images/backtest.png)

### 8. 관심종목 — `/watchlist`

종목 상세의 `관심 추가 ★` 로 등록한 종목(최대 50개)을 모아 본다. 주식은 장중 20초마다, 코인은 실시간 갱신. 휴지통 버튼으로 삭제, 행을 누르면 종목 상세로 이동.

![관심종목](docs/images/watchlist.png)

### 9. 매매 일지 — `/journal`

거래를 기록하고 통계를 본다.

- `새 거래 기록`: 종목 코드·시장·거래 유형(Long/Short)·수량·진입가·손절가·실현 손익과 **매매 근거**(서식·이미지를 넣을 수 있는 에디터)를 입력
- 실현 손익을 입력하면 **종료된 거래**로 집계된다(청산가 필드는 아직 없다 — [알려진 문제](#알려진-문제))
- 카드의 종목명을 누르면 해당 종목 상세로 이동한다 (국내주식은 6자리 코드, 코인은 `KRW-BTC` 또는 `BTC` 형태로 입력)
- 상단 필터: 기간·시장·유형·상태

![매매 일지](docs/images/journal.png)

![거래 기록 입력](docs/images/journal-form.png)

### 10. 성과 분석 — `/performance`

**아직 목업 데이터**(`src/mock/mock-performance-data.ts`)로 표시된다. 매매일지 기반 실데이터 연동은 [로드맵](#로드맵) 항목이다.

---

## 로컬 실행

### 1. 인프라

```bash
docker compose up -d
```

Postgres(:5432), Redis(:6379), Zookeeper(:2181), Kafka(:9092, 컨테이너 내부 `kafka:29092`), Kafka UI(:8989).
다른 프로젝트의 Postgres 가 5432 를 쓰고 있으면 tbill-postgres 포트가 붙지 않아 Java 가 DB 에 접속하지 못한다 — 한쪽만 켤 것.

### 2. Java 백엔드 (:8080)

`backend-java/.env` 에 `JWT_SECRET` 을 넣는다(gitignore 대상. 메인 클래스가 `java-dotenv` 로 읽는다). 어느 프로필에도 기본값이 없다.

```dotenv
# HS512 서명용 — Base64 인코딩된 64바이트 이상
JWT_SECRET=<openssl rand -base64 64 | tr -d '\n' 의 출력>
```

```bash
cd backend-java
./gradlew bootRun          # SPRING_PROFILES_ACTIVE=local 기본
```

나머지(DB·Redis·Kafka·Python API 주소)는 `local` 프로필 기본값이 `docker-compose.yml` 과 맞춰져 있다.
Swagger: http://localhost:8080/swagger-ui/index.html · Health: http://localhost:8080/actuator/health

### 3. Python (시세 API · 분석 worker · 실시간 스트리머)

```bash
cd backend-python
python -m venv .venv
.venv/Scripts/pip install -r requirements-dev.txt        # Linux/macOS: .venv/bin/pip

.venv/Scripts/python -m uvicorn app.api.main:app --port 8000   # 시세 API (필수)
.venv/Scripts/python -m app.worker.main                         # 전략 분석·백테스트 (분석 기능에 필요)
.venv/Scripts/python -m app.stream.main                         # 코인 실시간 (반드시 1개만 실행)
```

Windows 콘솔 로그의 한글이 깨지면 `PYTHONUTF8=1`. Docker 로 한 번에 띄우려면 `docker compose --profile app up -d` (py-api / py-worker / py-stream).

### 4. 프론트엔드 (:5173)

```bash
cd frontend
npm install
npm run dev
```

백엔드 주소가 다르면 `VITE_API_BASE_URL`(예: `http://localhost:8081/api`, `/api` 포함)을 지정한다.

### 무엇이 없으면 무엇이 안 되나

| 꺼져 있는 것 | 증상 |
|---|---|
| Python 시세 API | 시장·차트·검색·재무가 503 (`시세 서비스에 연결할 수 없습니다`) |
| Python worker | 전략 분석·백테스트가 `분석 중…` 에서 90초 뒤 타임아웃 |
| Python 스트리머 | 코인 가격이 실시간 대신 5초 폴링으로 갱신 |

### E2E 확인

```powershell
./test_integration.ps1     # Java → Kafka → Python worker → Redis 전략 분석 경로
```

---

## 구성

```
backend-java/    Spring Boot 3.3.1 / Java 21 (io.tbill.backendapi)                  :8080
                 인증(JWT)·영속 데이터(PostgreSQL)·공개 API·SSE 허브
backend-python/  app/ 패키지 하나, 실행 3종
                   app.api     시세 내부 API (FastAPI, Java 만 호출, X-Internal-Token)  :8000
                   app.worker  Kafka 분석 consumer (전략 점수·백테스트)
                   app.stream  Upbit WebSocket → Redis pub/sub (단일 인스턴스)
frontend/        React 19 + TypeScript + Vite + Redux Toolkit(RTK Query) + shadcn/ui   :5173
                 차트: lightweight-charts v5 (시세·자산곡선), recharts (기여도 막대)
infra/           Kubernetes 매니페스트 (Helm/Kustomize 없음)
docs/images/     README 스크린샷 (frontend/scripts/readme-screenshots.mjs 가 생성)
```

### 데이터 흐름

```
[시세·차트]   브라우저 ─REST─▶ Java /api/v1/market/** ─RestClient─▶ Python /internal/v1/**
                                                            └ 공급자 폴백 체인 + Redis 캐시
[코인 실시간] Upbit WS ─▶ app.stream ─PUBLISH market:tick:*─▶ Redis ─▶ Java SSE 허브
                                                            ─▶ 브라우저 EventSource (탭당 1개)
[분석·백테스트] 브라우저 ─POST─▶ Java ─Kafka─▶ app.worker ─▶ Redis analysis:{id}
                브라우저 ◀─폴링 GET /api/v1/analysis/result/{id}── Java
```

- **캐시는 Python(Redis)에만** 있다. TTL 은 봉 주기·장 운영 시간에 따라 다르다(1분봉 20초 ~ 장외 일봉 6시간).
- **공급자 폴백**: 국내 일봉 FDR → pykrx → yfinance, 국내 시세·재무 네이버, 미국 yfinance, 코인 Upbit. 공급자별 호출 간격 제한과 서킷브레이커(60초 내 5회 실패 시 5분 차단)가 있다.
- **캔들 시각**: UTC epoch 초. 일봉 이상은 거래소 현지 거래일 00:00 UTC 로 고정한다.
- **종목 키**: `시장:코드` (`KR_STOCK:005930`, `US_STOCK:AAPL`, `CRYPTO:KRW-BTC`), URL 은 `kr|us|crypto`.

언어 간 **수동 동기화가 필요한 계약**:

- Kafka 토픽명 — `KafkaTopics.java` ↔ `app/config.py`
- 분석 결과 스키마(camelCase, `schemaVersion: 2`) — `app/analysis/jobs.py`·`backtest.py` ↔ `frontend/src/types/strategy.types.ts`
- 지원 봉 주기 — Python `SUPPORTED_INTERVALS` ↔ `frontend/src/lib/market.ts`
- 지표 공식 — `app/analysis/indicators.py` ↔ `frontend/src/lib/indicators.ts` (같은 StockCharts RSI 기준값으로 테스트)

### Java 계층 구조

도메인(`journal`, `user`, `auth`, `content`, `analysis`, `market`, `watchlist`)마다 3계층을 반복한다.

- `presentation/<domain>/` — `Controller` + `<Domain>ApiDto`
- `domain/<domain>/` — `entity`, `repository`, `service`(인터페이스 + `Impl`), `<Domain>Dto`
- `infrastructure/` — `config`, `security`, `kafka`, `redis`, `client/python`
- `global/` — `GlobalExceptionHandler`, `AuthUtils`, `MarketException`

변환 사슬은 `ApiDto.toCommand(userEmail)` → 서비스 → `DomainDto.Info` → `ApiDto.Response`. `journal`·`watchlist` 가 참조 구현이다. 시세(`market`)는 순수 전달이라 `MarketDto` record 를 그대로 응답한다.

---

## 전략 점수 모델

`backend-python/app/analysis/scoring/` (가중치·임계값은 `weights.py`, 모델 버전 `v1`).

| 그룹 | 팩터 | 국내·미국 비중 | 코인 비중 |
|---|---|---|---|
| 기술적 | 추세(이동평균 배열·20일선 기울기·ADX·벤치마크 대비 상대강도) 40% · 모멘텀(RSI·MACD·변동성 정규화 ROC) 30% · 변동성(볼린저 %B·ATR 수준) 15% · 거래량(OBV·거래량 급증×방향) 15% | 50% | 65% |
| 기본적 | 밸류(PER·PBR) · 수익성(ROE·영업이익률) · 성장(EPS·매출) · 건전성(부채비율) · 배당 | 25% | — |
| 시장 국면 | 지수 추세(MA50·MA200) · 변동성 국면(VIX·실현변동성 백분위) · 시장 폭/심리(상승 종목 비율, 코인 공포·탐욕 역발상) | 25% | 35% |

- 팩터 점수는 -1(약세) ~ +1(강세). 데이터가 없는 팩터·그룹은 빼고 남은 가중치로 **재정규화**한다.
- 종합 점수 = 50 + 50 × 가중평균. **50 + Σ팩터 기여도 = 종합 점수**가 항상 성립한다(테스트로 보장).
- 시장 국면 점수가 매우 나쁘면(-0.5 미만) 매수 신호를 관망으로 낮춘다.
- 신뢰도 = 데이터 커버리지 × 그룹 간 방향 일치도.
- 매매 계획(롱 전용): 진입 구간 `[max(종가−0.5ATR, MA20), 종가]`, 손절 = 진입가 − k·ATR(주식 2, 코인 2.5), 목표 1.5R·3R, 샹들리에 추적 손절, 비중 = 위험비율×진입가/R (주식 최대 25%, 코인 10%). 가격은 호가 단위로 반올림.
- 국내 재무는 pykrx 전 종목 조회가 KRX 로그인을 요구하게 되어 **업종 백분위 대신 절대 구간**으로 평가한다.

---

## API

`API_BASE_URL` 기본값 `http://localhost:8080/api`. 전체 명세는 Swagger.

| 구분 | 메서드·경로 | 인증 | 비고 |
|---|---|---|---|
| 인증 | `POST /auth/sign-in` · `/auth/refresh` · `/auth/logout` | — / 쿠키 / 필요 | Access 는 **`access` 응답 헤더**, Refresh 는 `refresh_token` 쿠키 |
| 사용자 | `POST /users/sign-up`, `GET /users/check-username`, `GET /users/me` | | |
| 시세 | `GET /v1/market/symbols/search?q=&market=&limit=` | 필요 | |
| | `GET /v1/market/symbols/{market}/{code}` | 필요 | 없으면 404 |
| | `GET /v1/market/candles?market=&symbol=&interval=1d&from=&to=&limit=300` | 필요 | limit ≤ 2000 |
| | `GET /v1/market/quote?market=&symbol=` · `/quotes?keys=A:B,C:D` | 필요 | keys ≤ 50 |
| | `GET /v1/market/fundamentals?market=&symbol=` | 필요 | 주식만 |
| | `GET /v1/market/overview` · `/movers?market=&limit=` | 필요 | |
| | `GET /v1/market/stream?keys=CRYPTO:KRW-BTC,...` | **공개** | SSE (`snapshot`, `tick`), 코인만 최대 30개 |
| 관심종목 | `GET /v1/watchlist`, `POST /v1/watchlist/items`, `DELETE /v1/watchlist/items/{id}`, `PUT /v1/watchlist/items/order` | 필요 | 중복 409, 최대 50 |
| 분석 | `POST /v1/analysis/strategy` `{market, symbol, accountEquity?, riskPct?}` | 공개 | 201 `{requestId}` |
| | `POST /v1/analysis/backtest` `{market, symbol, from?, to?, buyThreshold?, ...}` | 공개 | 결과 24시간 보관 |
| | `GET /v1/analysis/result/{id}` | 공개 | `PROCESSING` → `RUNNING` → `SUCCESS`/`FAILED` |
| 매매일지 | `/journals` CRUD, `/journals/search`, `/journals/statistics` | 필요 | `reasoning` 은 `{markdown, images}` 객체 |
| 게시판 | `/contents`, `/contents/{id}/comments` | 필요 | 프론트 미연동 |

오류 응답은 `{"code": "...", "message": "..."}` (예: `MARKET_SYMBOL_NOT_FOUND` 404, `INTERVAL_NOT_SUPPORTED` 400, `MARKET_DATA_UNAVAILABLE` 503, `WATCHLIST_DUPLICATE` 409).

---

## 테스트

```bash
cd backend-java   && ./gradlew test              # JUnit5 + Mockito (49개)
cd backend-python && .venv/Scripts/python -m pytest   # 네트워크 없음: fakeredis·respx (58개)
cd frontend       && npm test                     # vitest, src/lib 순수 함수 (21개)
cd frontend       && npm run build && npm run lint
```

Windows + 한글 사용자명 환경에서 `./gradlew test` 가 `ClassNotFoundException: GradleWorkerMain` 으로 실패하면 [알려진 문제](#환경-windows--한글-사용자명) 참고.

---

## 알려진 문제

### 환경 (Windows + 한글 사용자명)

- **`./gradlew test` 실패**: `sun.jnu.encoding=MS949` 라 `C:\Users\<한글>\.gradle` 의 워커 jar 를 열지 못한다. 근본 해결은 Windows "Beta: 전 세계 언어 지원을 위해 UTF-8 사용" + 재부팅, 우회는 ASCII 경로의 `GRADLE_USER_HOME`(예: `C:\gradle-home`).
- **한글이 든 요청**: 셸 curl 로 한글 JSON 을 보내면 서버가 `Invalid UTF-8 start byte` 로 실패하고, Git Bash curl 은 한글 쿼리를 CP949 로 보내 검색 결과가 비어 나온다. ASCII 본문, `--data-binary @file.json`, 또는 Python/Node HTTP 클라이언트를 쓴다.
- Windows PowerShell 5.1 의 `Invoke-RestMethod` 는 charset 없는 JSON 의 한글을 깨뜨린다 (`test_integration.ps1` 은 UTF-8 로 직접 디코딩).

### 인프라

- **Kafka `InconsistentClusterIdException`**: `docker compose down && docker volume rm trading-manage-app_kafka_data && docker compose up -d` (보존할 데이터 없음).
- **스키마 변경**: 마이그레이션 도구가 없다. `local` 은 `ddl-auto: update`(기존 컬럼 타입은 안 바뀜), `prod` 는 `validate` 라 `backend-java/src/main/resources/db/manual/` 의 SQL 을 배포 전에 수동 실행해야 한다 (V2 일지 숫자 정밀도, V3 관심종목).
- **비공식 데이터 소스**: 네이버·yfinance 는 예고 없이 바뀔 수 있다. 폴백 체인이 버티지만, 깨지면 라이브러리를 업그레이드한다.

### 코드

| 위치 | 문제 |
|---|---|
| `JournalViewModal` | 매매 근거 HTML 을 `dangerouslySetInnerHTML` 로 렌더한다 — **XSS 위험, 우선 처리 권장** |
| 매매일지 화면 | 원화 거래도 `$` 로 표시하고, 코인 수량을 소수 3자리로 반올림해 보여준다 (저장은 소수 10자리) |
| `Journal` 엔티티 | 청산가·진입/청산일·수수료가 없다. `realizedPnL == null` 이 "미청산"의 유일한 정의 |
| `Journal.update()` | null-skip 방식이라 손절가·실현손익을 비울 수 없다 |
| 매매일지 검색 | 조건 하나만 적용된다 (`isClosed > market > symbol > dateRange` 우선순위, `tradeType` 무시) |
| `getStatistics()` | 기간 필터가 없고 손익 0 거래를 패배로 집계 |
| `Comment` 엔티티 | 빌더가 `comment` 를 대입하지 않아 댓글 생성이 항상 실패 |
| `User` | 역할 컬럼·`Journal` FK 가 없다 (이메일 문자열로 결합) |
| 리프레시 토큰 | 회전하지 않는다. 계정당 1개라 **다른 브라우저에서 다시 로그인하면 이전 세션은 새로고침 시 로그아웃**된다 |
| `GlobalExceptionHandler` | `HttpMessageNotReadableException` 핸들러가 없어 본문 형식 오류가 500 |
| 빈·중복 클래스 | `ApiResponse`·`ErrorCode`·`CustomException`·`TbillExceptionHandler` 등 빈 스텁, `JwtTokenProvider`·`UserDetailsServiceImpl` 미사용 중복, `types/trading.ts`·`trade.types.ts` 미사용 |
| 성과 분석 화면 | 목업 데이터 |
| 기타 | `package-lock.json`·`pnpm-lock.yaml` 공존(npm 기준), `tsconfig.app.tsbuildinfo` 가 git 추적됨, CI 없음 |

---

## 로드맵

| 단계 | 내용 | 상태 |
|---|---|---|
| 시세·차트 | 국내·미국·코인 시세, 캔들 차트·보조지표, 검색, 시장 개요 | ✅ |
| 실시간 | 코인 SSE 실시간 | ✅ (주식 실시간은 증권사 API 필요) |
| 전략 분석 | 기본적·기술적·시장 국면 정량 점수, 설명 가능한 기여도, ATR 매매 계획 | ✅ v1 |
| 백테스트 | 점수 전략 일봉 백테스트, 보유 대비 비교 | ✅ |
| 관심종목·대시보드 | 관심종목 CRUD, 실데이터 대시보드, 일지 연동 | ✅ |
| 다음 | 매매일지 스키마 보강(청산가·일자·수수료, 손익 자동 계산, Flyway), 성과 분석 실데이터화, 관심종목 점수 일괄 계산·알림, 점수 가중치 튜닝(walk-forward) | ⏳ |
| 이후 | 증권사(KIS) 연동 — 주식 실시간 시세, 모의투자 주문(수동 승인) → 소액 실계좌 자동 주문(금액 상한·킬 스위치·감사 로그) | ⏳ |

### 설계 원칙

- **가짜 데이터가 화면에 도달하지 않게 한다.** 모든 시세·캔들 응답에 `source` 와 `delayed` 를 싣고 UI 가 `지연 시세`·데이터 출처를 표시한다. 목업 폴백 플래그는 두지 않는다.
- **라이브 점수와 백테스트는 같은 코드를 쓴다.** 팩터는 모두 시계열 함수라 마지막 값이 라이브 점수, 전체가 백테스트 입력이다.
- **증권사 연동은 한 곳에서만.** 접근토큰 발급 제한·호출 쿼터가 앱키 단위라, 토큰 소유자가 둘이면 서로 차단한다.
- **브로커가 포지션과 현금의 진실을 소유한다.** 로컬 DB 는 의도(주문·신호·일지)만 소유한다.

---

## README 스크린샷 갱신

README 의 화면 이미지는 Playwright 로 자동 캡처한다. 모든 서비스를 띄운 뒤:

```bash
cd frontend
npm run docs:screenshots                       # 전체
npm run docs:screenshots -- backtest analysis  # 이름으로 일부만
```

- 데모 계정(`README_EMAIL`, 기본 `readme-demo@example.com` / `README_PASSWORD`)이 없으면 만들고, 관심종목·매매일지를 시드한 뒤 `docs/images/<이름>.png` 로 저장한다.
- 설치된 Chrome 을 쓴다(없으면 `CHROME_PATH`). 라이트 테마·1440×900 고정.
- 새 화면을 추가하면 `frontend/scripts/readme-screenshots.mjs` 의 `SHOTS` 배열에 항목을 추가하고, 이 README 의 해당 기능 절에 "무엇 / 사용 방법 / 화면" 형식으로 적는다.

## 커밋 컨벤션

`[Feat]` `[Update]` `[Fix]` `[Refactor]` `[Build]` `[Infra]` `[Remove]` 등 대괄호 접두어 + 한글 요약. 코드 주석·로그·커밋 메시지는 한글로 쓴다.

## 배포

```bash
docker build -t trading-manage-app/backend-java:latest ./backend-java
docker build -t trading-manage-app/backend-python:latest ./backend-python
docker build -t trading-manage-app/frontend:latest ./frontend

kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml  # 최초 1회
kubectl apply -f ./infra/
```

`infra/app-python.yaml` 은 한 이미지를 API(2 replica)·worker(1)·stream(**반드시 1**) 세 Deployment 로 띄운다. 배포 전 `infra/secrets.yaml` 의 `PYTHON_INTERNAL_TOKEN`·`JWT_SECRET` 을 교체할 것.
