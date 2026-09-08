# tbill — 트레이딩 매매일지 & 분석 서비스

트레이딩 관련 정보와 가중치를 판단해 사용자의 의사결정을 돕고, 최종적으로 자동매매까지 확장하는 것을 목표로 하는 서비스.

**대상 시장:** 국내주식 (한국투자증권 KIS Open API)
**자동화 단계:** 신호 제공 → 모의투자 → 소액 실거래

---

## 현재 상태

재개발을 시작한 시점(2026-09)의 정직한 상태다. **화면에 보이는 것과 실제로 동작하는 것이 다르므로 반드시 읽을 것.**

### 동작하는 것

| 기능 | 상태 |
|---|---|
| 회원가입 / 로그인 / 세션 갱신 / 로그아웃 | ✅ 종단 검증 완료 |
| 매매일지 CRUD + 페이징 + 통계 | ✅ 종단 검증 완료 |
| JWT 인증·인가 (Access 30분 / Refresh 1일, Refresh는 Redis) | ✅ |
| 매매일지 화면 | ✅ 실 API 연동 |

### 껍데기인 것

| 화면·기능 | 실제 |
|---|---|
| **AI 분석** | **시세 데이터가 `np.random` 으로 생성된다.** `technical_analyzer.py` 의 `_fetch_chart_data()` 는 함수 내부에 `np.random.seed(42)` 가 있어 **모든 종목이 영구히 동일한 결과**를 반환한다. `symbol`·`timeframe` 인자는 받기만 하고 쓰지 않는다 |
| 시장 트렌드 분석 | 시드 없는 백색소음. `# TODO: 실제 시장 지수 데이터 가져오기` 주석이 그대로 있고, 계산되는 "ATR" 은 수학적으로 `0.04 × mean(price)` 라 변동성 정보가 0이다 |
| 뉴스 분석 / 백테스팅 | `"구현 예정"` 문자열을 `status="SUCCESS"` 로 반환한다 |
| 대시보드 | 컴포넌트 안의 하드코딩 리터럴 |
| 성과 분석 | `src/mock/mock-performance-data.ts`. 차트 자리는 회색 placeholder `div` |
| 차트 / 실시간 | `recharts`·`socket.io-client` 가 설치돼 있으나 **import 0회** |

지표 **수식 자체**(RSI·MACD·이동평균·볼린저·거래량비)는 제대로 구현되어 있다. 진짜 수식에 가짜 입력이 들어가는 구조다.

자동매매에 필요한 것 중 **시세 수집, 주문 집행, 포지션, 백테스트 엔진, 전략 추상화, 스케줄러는 코드가 0줄**이다. 네트워크 클라이언트(`requests`/`httpx`/`yfinance` 등)도 전혀 없다.

---

## 구성

```
backend-java/    Spring Boot 3.3.1 / Java 21 REST API (io.tbill.backendapi)  :8080
                 영속 데이터(PostgreSQL/JPA)와 JWT 인증을 소유
backend-python/  Kafka 컨슈머. pandas/numpy 로 지표 계산 (HTTP 서버 없음)
frontend/        React 19 + TypeScript + Vite + Redux Toolkit + shadcn/ui   :5173
infra/           Kubernetes 매니페스트 (Helm/Kustomize 없음)
```

### 분석 파이프라인

Java 는 Python 을 HTTP 로 호출하지 않는다. Kafka 로 던지고 Redis 에서 만난다.

```
POST /api/v1/analysis/technical?symbol=...
  → AnalysisController 가 requestId(UUID) 발급, Kafka 토픽에 발행, 201 로 id 만 반환
  → Python main.py 가 토픽별 스레드로 수신, AnalysisHandler 가 analysisType 필드로 분기
  → 결과(성공·실패 모두)를 Redis  analysis:{requestId}  에 TTL 1시간으로 저장
  → 프론트가 GET /api/v1/analysis/result/{id} 를 폴링
     캐시 미스면 {"status":"PROCESSING"}, 히트면 Python JSON 을 그대로 반환
```

언어 간 계약 2개를 **수동으로** 맞춰야 한다:

- **토픽명** — `infrastructure/kafka/KafkaTopics.java` 와 `config/settings.py` 에 문자열이 중복
- **Redis 키 형식** — `AnalysisResultCacheService.KEY_PREFIX` 와 `redis_service.py` 의 f-string

Java 는 Spring Kafka `JsonSerializer`(camelCase)로 직렬화하고 Python 은 `models/schemas.py` 의 Pydantic 별칭으로 snake_case 에 매핑한다. `AnalysisRequest.java` 의 필드명을 바꾸면 Python 쪽이 런타임에 조용히 깨진다.

### Java 계층 구조

도메인(`journal`, `user`, `auth`, `content`, `analysis`)마다 반복되는 3계층 분리다.

- `presentation/<domain>/` — `Controller` + `<Domain>ApiDto` (HTTP 와이어 형태)
- `domain/<domain>/` — `entity`, `repository`, `service`(인터페이스 + `Impl`), `<Domain>Dto` (서비스 계층 형태)
- `infrastructure/` — `config`, `security`, `kafka`, `redis`
- `global/` — `GlobalExceptionHandler`, `AuthUtils`, `SwaggerConfig`

변환 사슬은 `ApiDto.toCommand(userEmail)` → 서비스 → `DomainDto.Info` → `new ApiDto.Response(info)`. 컨트롤러는 엔티티를 만지지 않는다. **`journal` 이 가장 완성도 높은 슬라이스이고 새 도메인의 참조 구현이다.** 엔티티는 감사를 위해 `BaseTimeEntity` 를 상속한다.

컨트롤러는 `AuthUtils.getCurrentUserEmail()` 로 호출자를 얻고 이메일을 소유권 키로 넘긴다 — 서비스는 사용자 id 가 아니라 이메일로 모든 쿼리를 스코프한다.

페이지를 반환하는 엔드포인트는 Spring `Page` 를 직접 직렬화하지 않고 `JournalApiDto.PagedResponse<T>` 로 감싼다(직접 직렬화하면 500이 났다).

---

## 로컬 실행

### 1. 인프라

```bash
docker compose up -d
```

Postgres(:5432), Redis(:6379), Zookeeper(:2181), Kafka(:9092), Kafka UI(:8989)가 올라온다.

### 2. 환경 변수

`backend-java/.env` 를 만든다. 메인 클래스가 `java-dotenv` 로 읽어 시스템 프로퍼티로 주입한다(`ignoreIfMissing` 이라 파일이 없어도 기동은 시도한다).

```dotenv
# HS512 서명용 — Base64 인코딩된 512bit 이상이어야 한다. 어느 프로필에도 기본값이 없다
JWT_SECRET=<base64-encoded-64-bytes-or-more>
```

나머지(`DB_POSTGRES_*`, `REDIS_*`, `KAFKA_BOOTSTRAP_SERVERS`)는 `local` 프로필이 `docker-compose.yml` 과 일치하는 기본값을 준다.

`JWT_SECRET` 생성:

```bash
openssl rand -base64 64 | tr -d '\n'
```

### 3. 백엔드

```bash
cd backend-java
./gradlew bootRun          # SPRING_PROFILES_ACTIVE=local 기본
```

- Swagger UI: http://localhost:8080/swagger-ui/index.html (local 프로필 전용)
- Health: http://localhost:8080/actuator/health

### 4. 프론트엔드

```bash
cd frontend
npm install
npm run dev                # :5173
```

백엔드를 다른 포트로 띄웠다면 `VITE_API_BASE_URL` 로 맞춘다(예: `http://localhost:8081/api`). `API_BASE_URL` 은 `/api` 를 이미 포함하므로 `constants.ts` 의 경로들은 `/api` 없이 쓴다.

### 5. Python 분석 서비스 (선택)

```bash
cd backend-python
pip install -r requirements.txt
python main.py             # 요청 토픽마다 컨슈머 스레드 1개
python test_kafka.py       # Kafka 연결 확인용 수동 프로듀서 (테스트 아님)
```

**주의:** 현재 반환값은 전부 합성 데이터다. 이 서비스를 띄우지 않으면 분석 결과 폴링이 영구히 `PROCESSING` 을 반환한다(프론트에 타임아웃·최대시도 가드가 없다).

---

## 테스트

```bash
cd backend-java
./gradlew test
./gradlew test --tests 'io.tbill.backendapi.domain.journal.service.JournalServiceImplTest'
./gradlew test --tests '*JournalServiceImplTest.createJournal*'
```

현재 24개 테스트. 커버리지는 `journal` 슬라이스와 `AuthUtils` 에 한정된다. 인증(JwtProvider·CookieUtil·RefreshTokenService), `user`, `content`, `analysis`, Kafka, Redis 는 테스트가 없다.

프론트엔드는 테스트 프레임워크가 없다. `npm run build`(= `tsc -b && vite build`)의 성공이 현재 기준선이다.

---

## 알려진 문제

### 환경 (Windows + 한글 사용자명)

**`./gradlew test` 가 `ClassNotFoundException: GradleWorkerMain` 으로 실패하면** 이 문제다.

```
sun.jnu.encoding = MS949
user.home        = C:\Users\������      ← 한글이 깨진다
```

워커 jar 가 `C:\Users\<한글>\.gradle\caches\...\gradle-worker.jar` 에 있는데 JVM 이 MS949 로 이 경로를 열지 못한다. **이 때문에 이 리포에서 테스트가 한 번도 실행되지 않았고**, 그래서 깨진 테스트 코드가 오래 방치됐다.

**근본 해결:** 제어판 → 지역 → 관리자 옵션 → "Beta: 전 세계 언어 지원을 위해 UTF-8 사용" 활성화 후 재부팅. 콘솔 로그 모자이크도 함께 해결된다. (관리자 권한 필요)

**임시 우회:** `GRADLE_USER_HOME` 을 ASCII 경로로 지정. 의존성 캐시가 새 위치에 다시 받아지므로 300MB~1GB 중복된다.

같은 인코딩 문제로 **셸에서 한글이 포함된 JSON 을 curl 로 보내면 서버가 `Invalid UTF-8 start byte` 로 500을 낸다.** API 를 수동 테스트할 때는 ASCII 본문을 쓰거나 파일(`--data-binary @file.json`)로 보낼 것.

### Kafka 기동 실패

`InconsistentClusterIdException` 이 나면 `kafka_data` 와 `zookeeper_data` 볼륨의 클러스터 ID 가 어긋난 것이다. 로컬 개발 환경이라 Kafka 데이터에 보존 가치가 없으므로:

```bash
docker compose down
docker volume rm trading-manage-app_kafka_data
docker compose up -d
```

### 포트 충돌

8080은 흔히 다른 프로젝트와 겹친다. 확인:

```powershell
Get-NetTCPConnection -LocalPort 8080 -State Listen | ForEach-Object { Get-Process -Id $_.OwningProcess }
```

다른 포트로 띄우려면 `./gradlew bootRun --args='--server.port=8081'` + 프론트에 `VITE_API_BASE_URL` 설정.

### 코드 결함

| 위치 | 문제 |
|---|---|
| `Journal` 엔티티 | **청산가(`exitPrice`)가 없다.** `realizedPnL` 을 사용자가 직접 입력하고, `realizedPnL == null` 이 "미청산"의 유일한 정의다. 진입/청산 일자·수수료도 없어 정확한 손익 계산이 불가능하다 |
| `User` ↔ `Journal` | FK 가 없다. `author_email` 문자열로만 결합되어 DB 가 강제하지 않는다 |
| `User` 엔티티 | 역할(role) 컬럼이 없다. `CustomUserDetails` 가 `ROLE_USER` 를 하드코딩한다 |
| `JournalDto.CreateCommand.toEntity()` | `realizedPnL` 을 조용히 버린다 → 이미 청산된 거래를 생성할 수 없다 |
| `Journal.update()` | null-skip 방식이라 손절가나 `realizedPnL` 을 비울 수 없다(거래 재개장 불가) |
| 매매일지 검색 | if/else 체인이 `isClosed > market > symbol > dateRange` 고정 우선순위로 **조건 하나만** 적용한다. `?market=CRYPTO&symbol=BTC` 는 `symbol` 을 조용히 무시하고, `tradeType` 은 API 가 받지만 어떤 쿼리도 쓰지 않는다 |
| `getStatistics()` | SQL 4회 + Java 산술. 평균손익·손익비·기대값·최대낙폭·종목별 분해가 없고 기간 필터도 없다(전체 기간 고정). 손익 0인 거래가 패배로 집계된다 |
| `Comment` 엔티티 | 빌더가 `content` 를 두 번 대입하고 `comment`(NOT NULL)를 대입하지 않는다 → **모든 댓글 생성이 실패한다** |
| `AuthController.logout` | `permitAll` 경로인데 `getAuthentication().getName()` 을 호출한다 → 토큰 없이 호출하면 NPE 500 |
| `GlobalExceptionHandler` | `HttpMessageNotReadableException` 핸들러가 없어 **본문 형식 오류가 400 이 아니라 500** 으로 나간다 |
| 리프레시 토큰 | 회전(rotation)하지 않는다. 탈취되면 24시간 내내 유효하다. 로그아웃 시 Access 토큰도 블랙리스트되지 않아 최대 30분 유효하다 |
| `backend-python/Dockerfile` | `uvicorn main:app` 을 실행하지만 `main.py` 에 `app` 객체가 없다 → **컨테이너가 기동하지 않는다.** 로컬은 `python main.py` 로 실행 |
| `requirements.txt` | 이전 HTTP 설계의 잔재로 `fastapi`/`uvicorn` 이 남아있고 파일이 UTF-16 인코딩이다 |
| 프론트 라우팅 | Dashboard·Journal·Analysis·Performance 에 URL 이 없다. Redux `state.page.activePage` 로 전환하므로 딥링크·브라우저 뒤로가기가 동작하지 않고(`pageSlice` 에 수동 `pageHistory` 가 있다), 새로고침 시 dashboard 로 초기화된다 |
| 분석 화면 폴링 | 3초 간격에 **타임아웃·최대시도 가드가 없다.** Python 워커가 죽으면 영구히 폴링한다 |
| 빈 스텁 클래스 | `ApiResponse`, `ErrorCode`, `CustomException`, `TbillExceptionHandler`, `JpaConfig`, `JwtTokenProvider`, `UserDetailsServiceImpl`, `KafkaConsumerConfig`, `ExampleEventProducer`, `ExampleEventConsumer` — 전부 `public class X {}` |
| 중복 클래스 | `JwtProvider`(사용) vs `JwtTokenProvider`, `CustomUserDetailsService`(사용) vs `UserDetailsServiceImpl`. 확장 전 `SecurityConfig` 를 확인할 것 |
| `ExampleEventProducer` / `ExampleEventConsumer` | producer/consumer 역할이 패키지 이름과 반대로 뒤바뀌어 있다 |
| 중복 타입 파일 | `types/analysis.ts` vs `analysis.types.ts`, `types/trading.ts` vs `trade.types.ts`. API 계층은 `*.types.ts` 를 쓰지만 `tradingSlice` 는 `analysis.ts` 를 쓴다 |
| 중복 훅 | `hooks/reduxHooks.ts` 와 `store/hooks.ts` 가 동일한 내용이고 파일마다 다른 것을 import 한다 |
| 패키지 매니저 | `package-lock.json` 과 `pnpm-lock.yaml` 이 동시에 존재한다. Vite 는 `overrides` 로 `rolldown-vite` 에 별칭돼 있다 |
| `tsconfig.app.tsbuildinfo` | 빌드 산출물인데 git 에 추적되고 있어 빌드마다 diff 가 생긴다 |
| `test_integration.ps1` | `/api/analysis/...` 를 때리지만 실제 경로는 `/api/v1/analysis/...` 이고, 존재하지 않는 Python HTTP health 엔드포인트(:8000)를 기대한다 |
| 마이그레이션 도구 | 없다. `local` 은 `ddl-auto: update`, `prod` 는 `validate` 라 **현재 prod 에 스키마 변경을 적용할 수단이 없다** |
| CI | 없다 (`.github/workflows/` 부재) |

---

## API

`API_BASE_URL` 기본값은 `http://localhost:8080/api`.

### 인증 / 사용자

| 메서드 | 경로 | 인증 | 비고 |
|---|---|---|---|
| POST | `/api/auth/sign-in` | — | Access 는 `access` 응답 헤더, Refresh 는 `refresh_token` 쿠키 |
| POST | `/api/auth/refresh` | 쿠키 | Access 만 재발급 (Refresh 회전 없음) |
| POST | `/api/auth/logout` | 필요 | Redis Refresh 삭제 + 쿠키 만료 |
| POST | `/api/users/sign-up` | — | 201 |
| GET | `/api/users/check-username?username=` | — | `{"isAvailable": boolean}` |
| GET | `/api/users/me` | 필요 | |

### 매매일지

| 메서드 | 경로 | 비고 |
|---|---|---|
| POST | `/api/journals` | 201. `reasoning` 은 `{markdown, images}` 객체 |
| GET | `/api/journals` | `page,size,sortBy,direction` → `PagedResponse` |
| GET / PUT / DELETE | `/api/journals/{journalId}` | DELETE 는 204 |
| GET | `/api/journals/search` | 조건 하나만 적용됨 (위 결함 참조) |
| GET | `/api/journals/open` · `/closed` | |
| GET | `/api/journals/statistics` | 전체 기간 고정 |

### 게시판 (프론트 미연동)

`/api/contents` CRUD, `/api/contents/{id}/comments`(생성 불가 — 위 결함 참조), `/api/comments/{id}`

### 분석 (현재 `permitAll`)

| 메서드 | 경로 |
|---|---|
| POST | `/api/v1/analysis/technical?symbol=&timeframe=&market=` |
| POST | `/api/v1/analysis/market-trend?market=` |
| GET | `/api/v1/analysis/result/{id}` |

---

## 로드맵

상세 계획은 별도 계획서에 있다. 요약:

| 마일스톤 | 목표 |
|---|---|
| **M1** | 기반 복구 + KIS 실시세. 실제 캔들·실제 지표가 출처 배지와 함께 UI 에 보인다. Kafka/Redis 폴링을 동기 조회 + SSE 로 접고, 지표를 Java 로 포팅해 `backend-python` 을 은퇴시킨다 |
| **M1.5** | Journal 스키마 수술. 청산가·진입/청산일·수수료 추가, 손익 계산화, `User` FK, Flyway 도입, 검색·통계 재작성 |
| **M2** | 가중치 엔진 & 신호/알림. 사용자 설정 가중치가 **설명 가능한** 신호를 만든다. 돈은 건드리지 않는다 |
| **M3** | KIS 모의투자 주문 실행. 멱등성·대조·상태 기계. 자동 발사 없음(수동 승인) |
| **M4** | 실계좌 소액 자동 주문. 금액 상한·킬 스위치·감사 로그 |
| **M5** | 성과 분석. 최대낙폭·자산곡선·신호 귀속. 백테스팅용으로 Python 을 오프라인 배치로 재도입 |

### 설계 원칙

- **KIS 연동은 Java 단독.** 접근토큰은 앱키당 1일 TTL 이고 재발급이 스로틀링되므로, 토큰 소유자가 둘이면 경쟁 발급으로 차단당한다. 초당 호출 쿼터도 프로세스가 아니라 앱키의 속성이다
- **브로커가 포지션과 현금의 진실을 소유한다.** 로컬 DB 는 의도(주문·신호·일지)만 소유한다. `Position`·`Balance` 테이블을 만들지 않는다 — 로컬 미러는 수동 거래·배당·액면분할 순간 드리프트하고, 그 실패 양상은 "보유하지 않은 포지션을 앱이 보여준다"다
- **가짜 데이터가 구조적으로 화면에 도달할 수 없게 한다.** 모든 가격 레코드에 `source` enum(`KIS_WS`/`KIS_REST`/`SYNTHETIC`)을 NOT NULL·기본값 없이 두고, 응답 DTO 에 노출해 UI 가 배지를 렌더한다. `USE_MOCK_DATA` 같은 폴백 플래그는 만들지 않는다
- **`socket.io` 대신 SSE.** socket.io 는 WebSocket 이 아니라 Engine.IO 프레이밍이라 Spring 엔드포인트로는 동작하지 않는다. `SseEmitter` 는 이미 `starter-web` 에 있고 기존 쿠키 인증을 그대로 쓴다

---

## 커밋 컨벤션

`feat` / `fix` / `docs` / `style` / `design` / `test` / `refactor` / `build` / `ci` / `perf` / `chore` / `rename` / `remove`

코드 주석·로그·커밋 메시지는 한글로 쓴다.

## 배포

```bash
docker build -t trading-manage-app/backend-java:latest ./backend-java
docker build -t trading-manage-app/frontend:latest ./frontend

kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml  # 최초 1회
kubectl apply -f ./infra/
```

`infra/app-python.yaml` 은 위의 Dockerfile 결함 때문에 현재 동작하지 않는다.
