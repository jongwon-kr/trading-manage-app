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

`tbill` — a trading journal + AI analysis app. Three deployables in one repo, glued by Kafka and Redis:

- `backend-java/` — Spring Boot 3.3.1 / Java 21 REST API (`io.tbill.backendapi`). Owns all persisted data (PostgreSQL/JPA) and JWT auth. Port 8080.
- `backend-python/` — headless Kafka consumer that runs technical/market analysis with pandas/numpy. No HTTP server (see gotchas). Port 8000 is only declared, never bound.
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
pip install -r requirements.txt
python main.py             # starts one consumer thread per request topic
python test_kafka.py       # standalone Kafka connectivity probe
```

Frontend (`frontend/`):

```bash
npm run dev
npm run build              # tsc -b && vite build
npm run lint
```

End-to-end smoke test of the Java↔Python analysis path: `./test_integration.ps1` (PowerShell; partly stale — see gotchas).

Swagger UI: http://localhost:8080/swagger-ui/index.html (local profile only). Kafka UI: http://localhost:8989.

## Architecture

### The analysis pipeline (the one flow that spans all three services)

Java never calls Python over HTTP. The handoff is fire-and-forget over Kafka with a Redis rendezvous:

1. `POST /api/v1/analysis/technical?symbol=...` — `AnalysisController` mints a `requestId` (UUID), publishes an `AnalysisRequest` to a per-type Kafka topic, and returns `201` with just the id.
2. Python's `main.py` runs one `KafkaConsumerService` thread per topic, all pointed at the single `AnalysisHandler.handle_analysis_request`, which dispatches on the `analysisType` field rather than on which topic delivered it.
3. `AnalysisHandler` writes the result — successes _and_ failures (`status: "FAILED"`) — to Redis at `analysis:{requestId}` with a 1-hour TTL.
4. The frontend polls `GET /api/v1/analysis/result/{id}`. A cache miss returns `{"status": "PROCESSING"}`; a hit returns Python's JSON verbatim (Java deserializes to `Object` and re-emits, so the Python schema is the API contract for this endpoint).

Two contracts must be kept in sync manually across languages:

- **Topic names** — `infrastructure/kafka/KafkaTopics.java` and `config/settings.py` hold duplicate string literals.
- **Redis key format** — `AnalysisResultCacheService.KEY_PREFIX` (`"analysis:"`) and `redis_service.py`'s f-strings.

Java serializes with Spring Kafka's `JsonSerializer` (camelCase, `spring.json.trusted.packages: "*"`); Python parses with Pydantic models in `models/schemas.py` that alias camelCase onto snake_case fields. A renamed field in `AnalysisRequest.java` silently breaks the Python side at runtime.

`ANALYSIS_RESPONSE_TOPIC` exists in `settings.py` but nothing produces or consumes it — the return path is Redis only.

### Java layering

Package structure is a deliberate three-layer split, repeated per domain (`journal`, `user`, `auth`, `content`, `analysis`):

- `presentation/<domain>/` — `Controller` + `<Domain>ApiDto` (the HTTP wire shape: `CreateRequest`, `JournalResponse`, `PagedResponse<T>`).
- `domain/<domain>/` — `entity`, `repository`, `service` (interface + `Impl`), and `<Domain>Dto` (the service-layer shape: `CreateCommand`, `UpdateCommand`, `SearchCondition`, `JournalInfo`, `Statistics`).
- `infrastructure/` — `config` (Security, Kafka, Redis, JPA), `security` (JWT filter/provider/handlers), `kafka`, `redis`.
- `global/` — cross-cutting: `GlobalExceptionHandler`, `AuthUtils`, `SwaggerConfig`.

The conversion chain is `ApiDto.toCommand(userEmail)` → service → `DomainDto.Info` → `new ApiDto.Response(info)`. Controllers do not touch entities. `journal` is the most complete slice and the reference implementation for a new domain; entities extend `BaseTimeEntity` for auditing.

Controllers resolve the caller with `AuthUtils.getCurrentUserEmail()` and pass the email down as the ownership key — services scope every query by email rather than by user id.

Endpoints returning pages wrap `Page<T>` in `JournalApiDto.PagedResponse<T>` rather than serializing Spring's `Page` directly (doing the latter caused 500s).

### Auth

Stateless JWT. `JwtAuthenticationFilter` reads the `Authorization` header or a cookie via `CookieUtil`; refresh tokens live in Redis (`RefreshTokenService`). Access token 30 min, refresh 1 day. `SecurityConfig.PUBLIC_PATHS` is the allowlist — note `/api/v1/analysis/**` is public, which is why `AnalysisController` wraps `AuthUtils` in a try/catch.

On the frontend, `api/axios.ts` holds the whole auth lifecycle: a request interceptor injects the access token from the Redux store, and a response interceptor catches 401s, single-flights a `refreshSession()` dispatch, queues concurrent failures in `failedQueue`, and replays them. The store is injected via `injectStore()` from `store/index.ts` to avoid a circular import. Endpoint paths are centralized in `utils/constants.ts` (`API_BASE_URL` already includes `/api`, so paths there are written without it).

### Configuration

Java config is layered: `application.yaml` (shared, all values from env vars with no defaults) plus `application-{local,prod,test}.yaml`. The `local` profile supplies localhost/`1234` defaults matching `docker-compose.yml`; `prod` expects env injection from `infra/configmap.yaml` and `infra/secrets.yaml`. `JWT_SECRET` has no default in any profile except `test`.

Tests use the `test` profile: in-memory H2 in PostgreSQL mode, `ddl-auto: create-drop`, `SecurityAutoConfiguration` excluded. Repository tests use `@DataJpaTest` + `@AutoConfigureTestDatabase(Replace.NONE)`; service and controller tests are plain Mockito (`@ExtendWith(MockitoExtension.class)`), not `@SpringBootTest`. Only `journal` has test coverage.

Python config is a single `@dataclass Settings` in `config/settings.py` reading env vars via `python-dotenv`, with localhost defaults. No `.env` files are committed.

## Gotchas

- `backend-python/Dockerfile` runs `uvicorn main:app`, but `main.py` has no `app` object — it is a `__main__` script. The container as written will not start; run `python main.py` locally. `requirements.txt` still lists `fastapi`/`uvicorn` from an earlier HTTP design and is UTF-16 encoded.
- `test_integration.ps1` targets `/api/analysis/...` and expects a Python HTTP health endpoint on `:8000`; the real routes are `/api/v1/analysis/...` and there is no Python server. Fix the paths before trusting it.
- `global/common/ApiResponse.java`, `global/exception/ErrorCode.java`, `global/exception/CustomException.java`, and `global/exception/TbillExceptionHandler.java` are empty placeholder classes. Error responses actually come from `GlobalExceptionHandler`'s `ErrorResponse` record.
- Several security classes are duplicated with only one wired in: `JwtProvider` (used) vs `JwtTokenProvider`, `CustomUserDetailsService` vs `UserDetailsServiceImpl`. Check `SecurityConfig` before extending either.
- `infrastructure/kafka/consumer/ExampleEventProducer.java` and `infrastructure/kafka/producer/ExampleEventConsumer.java` have their producer/consumer roles swapped relative to their packages.
- `AuthUtils.getCurrentUserEmail()` now throws `AuthenticationCredentialsNotFoundException` instead of falling back to `"test@example.com"`. `GlobalExceptionHandler` has an `AuthenticationException` handler that maps it to 401 — that handler is load-bearing, because `@RestControllerAdvice` intercepts before `ExceptionTranslationFilter`, so without it the generic `Exception` handler would return 500.
- `frontend/` has both `package-lock.json` and `pnpm-lock.yaml`. Vite is aliased to `rolldown-vite` via `overrides`.
- `frontend/src/types/` has overlapping pairs (`analysis.ts` / `analysis.types.ts`, `trading.ts` / `trade.types.ts`). The API layer imports `*.types.ts`, but `tradingSlice` imports `MarketData`/`PreMarketAnalysis` from `analysis.ts` — both files are live. `mock/mock-performance-data.ts` still backs the Performance page.
- `GlobalExceptionHandler` has no `HttpMessageNotReadableException` handler, so a malformed request body returns 500 rather than 400.
- **Windows + non-ASCII username breaks `./gradlew test`** with `ClassNotFoundException: GradleWorkerMain`. `sun.jnu.encoding` is MS949 and the worker jar lives under `C:\Users\<Hangul>\.gradle\`, which the JVM cannot open. This is why tests had never run in this tree. Fix: enable Windows' "Beta: Use Unicode UTF-8 for worldwide language support" and reboot; workaround: an ASCII `GRADLE_USER_HOME`. The same encoding issue makes `curl` with a Korean JSON body fail server-side as `Invalid UTF-8 start byte` — use ASCII bodies or `--data-binary @file.json` for manual API testing.
- `Journal.CreateRequest.reasoning` is a `{markdown, images}` object, not a string. Sending a bare string yields 500 (see the missing handler above).
- Kafka can fail to start with `InconsistentClusterIdException` when the `kafka_data` and `zookeeper_data` volumes disagree. `docker compose down && docker volume rm trading-manage-app_kafka_data && docker compose up -d` — the volume holds no topic data worth keeping.
- `frontend/tsconfig.app.tsbuildinfo` is a build artifact that is tracked in git, so it shows as modified after every build.

## Conventions

Commit messages use a Korean-language bracketed prefix: `[Feat]`, `[Update]`, `[Fix]`, `[Refactor]`, `[Build]`, `[Infra]`, `[Remove]` — e.g. `[Update] 분석 요청 API 관련 기능 추가`. PRs follow `.github/pull_request_template.md`.

Frontend imports use the `@/` alias for `src/`. UI is shadcn/ui (`components.json`, `components/ui/`) — add components rather than hand-rolling primitives.
