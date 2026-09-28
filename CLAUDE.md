# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## 답변 방식

- 한글로 답변

## Git 커밋 컨벤션

- feat: 새로운 기능 추가
- fix: 버그 수정
- docs: 문서 수정
- style: 코드 스타일 변경 (코드 포매팅, 세미콜론 누락 등)
- design: 사용자 UI 디자인 변경 (CSS 등)
- test: 테스트 코드, 리팩토링 (Test Code)
- refactor: 리팩토링 (Production Code)
- build: 빌드 파일 수정
- ci: CI 설정 파일 수정
- perf: 성능 개선
- chore: 자잘한 수정이나 빌드 업데이트
- rename: 파일 혹은 폴더명을 수정만 한 경우
- remove: 파일을 삭제만 한 경우

## Overview

`tbill` — market data + charts (KR/US stocks, Upbit crypto) + a quantified strategy score/backtest + a trading journal. Three deployables in one repo, glued by HTTP (market data), Kafka (analysis jobs) and Redis (cache, results, pub/sub):

- `backend-java/` — Spring Boot 3.3.1 / Java 21 REST API (`io.tbill.backendapi`). Owns all persisted data (PostgreSQL/JPA) and JWT auth. Port 8080.
- `backend-python/` — one package (`app/`), three entrypoints: `app.api.main` (internal FastAPI market-data API, port 8000, `X-Internal-Token`), `app.worker.main` (Kafka analysis consumer), `app.stream.main` (Upbit realtime, single replica).
- `frontend/` — React 19 + TypeScript + Vite + Redux Toolkit + shadcn/ui + Tailwind. Port 5173.
- `infra/` — raw Kubernetes manifests (no Helm/Kustomize).

Codebase comments, logs, and commit messages are in Korean. Match that when editing existing files.

## Commands

Infrastructure (Postgres, Redis, Zookeeper, Kafka, Kafka UI on :8989) must be up first:

```bash
docker compose up -d
```

Java (`backend-java/`, use `./gradlew` or `gradlew.bat`):

```bash
./gradlew bootRun          # defaults to SPRING_PROFILES_ACTIVE=local
./gradlew build
./gradlew test
./gradlew test --tests 'io.tbill.backendapi.domain.journal.service.JournalServiceImplTest'
./gradlew test --tests '*JournalServiceImplTest.createJournal*'
```

Python (`backend-python/`):

```bash
python -m venv .venv && .venv/Scripts/pip install -r requirements-dev.txt
.venv/Scripts/python -m uvicorn app.api.main:app --port 8000   # internal market-data API
.venv/Scripts/python -m app.worker.main                         # Kafka consumers (creates missing topics)
.venv/Scripts/python -m pytest                                  # no network; fakeredis + fixtures
.venv/Scripts/python test_kafka.py                              # standalone Kafka probe
```

Frontend (`frontend/`):

```bash
npm run dev
npm run build              # tsc -b && vite build
npm run lint
```

Python streamer (Upbit realtime → Redis pub/sub; run exactly one): `.venv/Scripts/python -m app.stream.main`. Frontend unit tests: `npm test` (vitest, pure `src/lib` functions only).

End-to-end smoke test of the Java→Kafka→Python→Redis strategy path: `./test_integration.ps1` (PowerShell).

Swagger UI: http://localhost:8080/swagger-ui/index.html (local profile only). Kafka UI: http://localhost:8989.

## Architecture

### Market data (synchronous)

Browser → Java `/api/v1/market/**` (`MarketController`, JWT) → `PythonMarketClient` (`RestClient`, `X-Internal-Token`) → Python `/internal/v1/**` (`app/api/routers/market.py`) → `MarketDataService` (`app/market/service.py`). Java is a thin pass-through: the `MarketDto` records *are* the response bodies, and Python's `{code, message}` errors become `MarketException` (Python 404→404, other 4xx→400, 5xx/timeout/401-token→503).

All caching lives in Python/Redis (`mkt:*` keys, TTL by interval and market hours, single-flight `lock:*`). Providers sit behind fallback chains with a per-provider rate limiter + circuit breaker (`first_success` in `providers/base.py`): KR daily fdr→pykrx→yfinance(`.KS/.KQ`), KR quotes/fundamentals from Naver, US from yfinance, crypto from Upbit. The symbol master (KRX listing, NASDAQ Trader files, Upbit markets) is held in memory, cached 24h in Redis, with a disk snapshot in `backend-python/data/`. Candle wire format is lightweight-charts' `{time, open, high, low, close, volume}`; `time` is UTC epoch seconds and **daily-or-longer bars are pinned to the exchange-local trading date at 00:00 UTC**.

Keys everywhere are `MARKET:CODE` with `MARKET ∈ KR_STOCK | US_STOCK | CRYPTO` (Java `InstrumentMarket`, Python `Market`); URLs use slugs `kr|us|crypto` (`frontend/src/lib/market.ts`). Supported intervals per market are duplicated in Python and frontend `SUPPORTED_INTERVALS`.

### Realtime (crypto only)

`app.stream` subscribes to *all* Upbit KRW tickers on one WebSocket, coalesces to ≤1 update/s/symbol, and writes `quote:CRYPTO:{code}` + `PUBLISH market:tick:CRYPTO:{code}`. Java `MarketTickListener` (pattern subscription in `RedisPubSubConfig`, disabled in tests via `market.stream.enabled=false`) feeds `MarketStreamService`, an `SseEmitter` hub behind public `GET /api/v1/market/stream?keys=` (EventSource can't send auth headers; `ASYNC`/`ERROR` dispatches are permitted in `SecurityConfig`). The frontend `lib/realtime/ticker-store.ts` keeps **one EventSource per tab** with ref-counted keys; ticks bypass Redux (`useTick`, `subscribeTicks`). Stocks are polled via RTK Query instead.

### The analysis pipeline (async jobs)

Java never calls Python over HTTP for analysis. The handoff is fire-and-forget over Kafka with a Redis rendezvous:

1. `POST /api/v1/analysis/strategy` or `/backtest` (JSON body) — `AnalysisController` mints a `requestId` (UUID), publishes an `AnalysisRequest` (options as a JSON string in `parameters`) to a per-type Kafka topic, and returns `201` with just the id. The legacy `/technical` and `/market-trend` query-param endpoints still exist.
2. Python's `app/worker/main.py` runs one `KafkaConsumerService` thread per topic, all pointed at the single `AnalysisHandler.handle_analysis_request`, which dispatches on the `analysisType` field rather than on which topic delivered it.
3. `AnalysisHandler` writes `RUNNING` (backtests add `progress`), then `SUCCESS` or `FAILED` — even for unparseable requests — to Redis at `analysis:{requestId}` (1h TTL, backtests 24h). Payloads are camelCase with `schemaVersion: 2`.
4. The frontend polls `GET /api/v1/analysis/result/{id}` via `useAnalysisJob`. A cache miss returns `{"status": "PROCESSING"}`; a hit returns Python's JSON verbatim (Java deserializes to `Object` and re-emits, so the Python schema is the API contract — TS mirror in `frontend/src/types/strategy.types.ts`).

The strategy model (`app/analysis/scoring/`, constants in `weights.py`, `MODEL_VERSION`) scores factors in [-1, 1], averages them per group over *available* factors, re-weights groups by coverage, and maps to `score = 50 + 50·C`. Invariant (tested): `50 + Σ factor.contribution == score`. Every factor is a pandas `Series → Series` function so the backtest (`app/analysis/backtest.py`) reuses exactly the live factors; fundamentals and breadth are excluded from backtests because there is no point-in-time history. Indicator formulas (Wilder RSI/ATR, population-σ Bollinger, SMA-seeded EMA) are duplicated in `frontend/src/lib/indicators.ts` for chart overlays — both are tested against the same StockCharts RSI fixture.

Two contracts must be kept in sync manually across languages:

- **Topic names** — `infrastructure/kafka/KafkaTopics.java` and `app/config.py` hold duplicate string literals.
- **Redis key format** — `AnalysisResultCacheService.KEY_PREFIX` (`"analysis:"`) and `app/worker/handler.py`; `market:tick:*` / `quote:CRYPTO:*` in `app/stream/upbit_ws.py`, `MarketTickListener`, and `MarketStreamService`.

Java serializes with Spring Kafka's `JsonSerializer` (camelCase, `spring.json.trusted.packages: "*"`); Python parses with Pydantic models in `app/analysis/schemas.py` that alias camelCase onto snake_case fields. A renamed field in `AnalysisRequest.java` silently breaks the Python side at runtime.


### Java layering

Package structure is a deliberate three-layer split, repeated per domain (`journal`, `user`, `auth`, `content`, `analysis`, `market`, `watchlist`):

- `presentation/<domain>/` — `Controller` + `<Domain>ApiDto` (the HTTP wire shape: `CreateRequest`, `JournalResponse`, `PagedResponse<T>`).
- `domain/<domain>/` — `entity`, `repository`, `service` (interface + `Impl`), and `<Domain>Dto` (the service-layer shape: `CreateCommand`, `UpdateCommand`, `SearchCondition`, `JournalInfo`, `Statistics`).
- `infrastructure/` — `config` (Security, Kafka, Redis, pub/sub), `security` (JWT filter/provider/handlers), `kafka`, `redis`, `client/python` (market-data RestClient).
- `global/` — cross-cutting: `GlobalExceptionHandler`, `AuthUtils`, `SwaggerConfig`.

The conversion chain is `ApiDto.toCommand(userEmail)` → service → `DomainDto.Info` → `new ApiDto.Response(info)`. Controllers do not touch entities. `journal` is the most complete slice and the reference implementation for a new domain; entities extend `BaseTimeEntity` for auditing.

Controllers resolve the caller with `AuthUtils.getCurrentUserEmail()` and pass the email down as the ownership key — services scope every query by email rather than by user id.

Endpoints returning pages wrap `Page<T>` in `JournalApiDto.PagedResponse<T>` rather than serializing Spring's `Page` directly (doing the latter caused 500s).

### Auth

Stateless JWT. `JwtAuthenticationFilter` reads the `Authorization` header or a cookie via `CookieUtil`; refresh tokens live in Redis (`RefreshTokenService`). Access token 30 min, refresh 1 day. `SecurityConfig.PUBLIC_PATHS` is the allowlist — note `/api/v1/analysis/**` is public, which is why `AnalysisController` wraps `AuthUtils` in a try/catch.

The access token is returned in the **`access` response header**, not the body (`AuthController`; CORS exposes it). `api/auth.api.ts` merges it into the `AuthResponse` — before that fix no authenticated call worked.

On the frontend, `api/axios.ts` holds the whole auth lifecycle: a request interceptor injects the access token from the Redux store, and a response interceptor catches 401s, single-flights a `refreshSession()` dispatch, queues concurrent failures in `failedQueue`, and replays them. The store is injected via `injectStore()` from `store/index.ts` to avoid a circular import. Endpoint paths are centralized in `utils/constants.ts` (`API_BASE_URL` already includes `/api`, so paths there are written without it). New server state goes through RTK Query (`api/base.api.ts` wraps the same axios instance, so auth/refresh apply; the cache is reset on logout); the journal still uses hand-written thunks in `tradingSlice`. Routing is URL-based (`App.tsx` nested layout routes, menu/header titles in `components/layout/nav-items.ts`); `frontend/nginx.conf` provides the SPA fallback for deep links.

### Configuration

Java config is layered: `application.yaml` (shared, all values from env vars with no defaults) plus `application-{local,prod,test}.yaml`. The `local` profile supplies localhost/`1234` defaults matching `docker-compose.yml`; `prod` expects env injection from `infra/configmap.yaml` and `infra/secrets.yaml`. `JWT_SECRET` has no default in any profile except `test`.

Tests use the `test` profile: in-memory H2 in PostgreSQL mode, `ddl-auto: create-drop`, `SecurityAutoConfiguration` excluded. Repository tests use `@DataJpaTest` + `@AutoConfigureTestDatabase(Replace.NONE)`; service and controller tests are plain Mockito (`@ExtendWith(MockitoExtension.class)`), not `@SpringBootTest`; `PythonMarketClientTest` uses `MockRestServiceServer`. Python tests never hit the network (fakeredis, respx, providers monkeypatched via the `service` fixture in `tests/conftest.py`).

Python config is a single pydantic-settings `Settings` in `app/config.py` (env vars / `.env`), with localhost defaults. No `.env` files are committed.

## Gotchas

- `backend-python/Dockerfile` defaults to the API; compose (`--profile app`) and `infra/app-python.yaml` override `command` for the worker/stream. Compose's Kafka advertises `localhost:9092` to the host and `kafka:29092` to containers.
- pykrx cross-sectional calls (`get_market_fundamental(date, market="ALL")`, market-wide OHLCV) now require a KRX login and return empty; only per-ticker OHLCV works. KR fundamentals therefore come from Naver (`naver_provider.py`) and are scored with absolute bands, not sector percentiles. Naver and yfinance are unofficial — when one breaks, the fallback chain/circuit breaker keeps the API up; upgrade the library (loose pins in `requirements.txt`).
- The root `.gitignore` (Python template) ignores `lib/`; `!frontend/src/lib/` re-includes the frontend modules. Check `git check-ignore` before adding another `lib` directory.
- Schema changes need a manual SQL in `backend-java/src/main/resources/db/manual/` for prod (`ddl-auto: validate`); local `update` never alters existing column types.
- `global/common/ApiResponse.java`, `global/exception/ErrorCode.java`, `global/exception/CustomException.java`, and `global/exception/TbillExceptionHandler.java` are empty placeholder classes. Error responses actually come from `GlobalExceptionHandler`'s `ErrorResponse` record.
- Several security classes are duplicated with only one wired in: `JwtProvider` (used) vs `JwtTokenProvider`, `CustomUserDetailsService` vs `UserDetailsServiceImpl`. Check `SecurityConfig` before extending either.
- `infrastructure/kafka/consumer/ExampleEventProducer.java` and `infrastructure/kafka/producer/ExampleEventConsumer.java` have their producer/consumer roles swapped relative to their packages.
- `AuthUtils.getCurrentUserEmail()` now throws `AuthenticationCredentialsNotFoundException` instead of falling back to `"test@example.com"`. `GlobalExceptionHandler` has an `AuthenticationException` handler that maps it to 401 — that handler is load-bearing, because `@RestControllerAdvice` intercepts before `ExceptionTranslationFilter`, so without it the generic `Exception` handler would return 500.
- `frontend/` has both `package-lock.json` and `pnpm-lock.yaml`. Vite is aliased to `rolldown-vite` via `overrides`.
- `frontend/src/types/trading.ts` and `trade.types.ts` are unused leftovers. `mock/mock-performance-data.ts` still backs the Performance page.
- `GlobalExceptionHandler` has no `HttpMessageNotReadableException` handler, so a malformed request body returns 500 rather than 400.
- **Windows + non-ASCII username breaks `./gradlew test`** with `ClassNotFoundException: GradleWorkerMain`. `sun.jnu.encoding` is MS949 and the worker jar lives under `C:\Users\<Hangul>\.gradle\`, which the JVM cannot open. This is why tests had never run in this tree. Fix: enable Windows' "Beta: Use Unicode UTF-8 for worldwide language support" and reboot; workaround: an ASCII `GRADLE_USER_HOME`. The same encoding issue makes `curl` with a Korean JSON body fail server-side as `Invalid UTF-8 start byte`, and Git-Bash curl sends Korean query strings in CP949 (search returns `[]`) — use ASCII, `--data-binary @file.json`, or a Python HTTP client. Windows PowerShell 5.1 `Invoke-RestMethod` mis-decodes charset-less JSON; `test_integration.ps1` decodes bytes as UTF-8.
- `Journal.CreateRequest.reasoning` is a `{markdown, images}` object, not a string. Sending a bare string yields 500 (see the missing handler above).
- Kafka can fail to start with `InconsistentClusterIdException` when the `kafka_data` and `zookeeper_data` volumes disagree. `docker compose down && docker volume rm trading-manage-app_kafka_data && docker compose up -d` — the volume holds no topic data worth keeping.
- `frontend/tsconfig.app.tsbuildinfo` is a build artifact that is tracked in git, so it shows as modified after every build.

## Conventions

**README updates always follow the `update-readme` project skill** (`.claude/skills/update-readme/SKILL.md`): re-capture feature screens with `cd frontend && npm run docs:screenshots` (Playwright, `frontend/scripts/readme-screenshots.mjs` → `docs/images/`), inspect every PNG, and document each feature as "what it does / how to use it / screenshot". Add a `SHOTS` entry for every new screen.

Commit messages use a Korean-language bracketed prefix: `[Feat]`, `[Update]`, `[Fix]`, `[Refactor]`, `[Build]`, `[Infra]`, `[Remove]` — e.g. `[Update] 분석 요청 API 관련 기능 추가`. PRs follow `.github/pull_request_template.md`.

Frontend imports use the `@/` alias for `src/`. UI is shadcn/ui (`components.json`, `components/ui/`) — add components rather than hand-rolling primitives.
