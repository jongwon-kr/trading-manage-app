---
name: update-readme
description: README.md 를 갱신할 때 사용한다. 기능이 추가·변경되었거나 README 업데이트를 요청받으면, Playwright 로 기능별 화면을 다시 캡처하고 "무엇 / 사용 방법 / 화면" 형식으로 README 를 고친다.
---

# README 갱신 절차

이 저장소의 README 는 **사용자가 기능을 알아보고 따라 할 수 있는 문서**다. 기능 설명에는 항상 실제 화면 캡처를 붙인다. 캡처는 손으로 찍지 않고 `frontend/scripts/readme-screenshots.mjs` 로 재현 가능하게 만든다.

## 1. 무엇이 바뀌었는지 파악

- `git log`/`git diff` 로 README 마지막 갱신 이후 바뀐 기능·화면·API·실행 방법을 정리한다.
- README 의 "알려진 문제" 표에서 **해결된 항목은 지우고**, 새로 알게 된 문제는 추가한다. 테스트 개수, 실행 명령, API 표도 실제와 맞춘다.

## 2. 서비스 기동 (캡처 전제)

```bash
docker compose up -d
cd backend-java && ./gradlew bootRun                              # JWT_SECRET 은 backend-java/.env
cd backend-python && .venv/Scripts/python -m uvicorn app.api.main:app --port 8000
cd backend-python && .venv/Scripts/python -m app.worker.main      # 전략 분석·백테스트 캡처에 필요
cd backend-python && .venv/Scripts/python -m app.stream.main      # 코인 실시간 캡처에 필요 (1개만)
cd frontend && npm run dev
```

이미 떠 있는 프로세스가 있으면 중복 실행하지 않는다 (worker·stream 중복은 이중 처리 원인). Windows 에서 5432 를 다른 Postgres 가 쓰고 있으면 tbill-postgres 포트가 붙지 않는다.

## 3. 캡처

- 새 화면·기능이 생겼으면 `frontend/scripts/readme-screenshots.mjs` 의 `SHOTS` 배열에 항목을 추가한다.
  - `name`(파일명), `path`, `ready`(캡처 전 기다릴 선택자 — 데이터가 채워진 뒤를 가리킬 것), 필요하면 `prepare`(클릭·입력), `element`(부분 캡처), `fullPage`, `theme: "dark"`, `settle`(차트 안정화 ms).
  - 데모 데이터가 필요하면 같은 파일의 `WATCHLIST`/`JOURNALS` 시드를 늘린다. 데모 계정은 `readme-demo@example.com`.
- 실행:

```bash
cd frontend
npm run docs:screenshots                  # 전체
npm run docs:screenshots -- <name> ...    # 바뀐 화면만
```

- **생성된 PNG 를 반드시 직접 열어 확인한다** (Read 도구). 확인할 것: 로딩 스켈레톤·빈 데이터·에러 메시지가 찍히지 않았는지, 글자가 배경에 묻히지 않았는지(라이트·다크), 차트가 그려졌는지. 문제가 있으면 `ready`/`settle` 을 고쳐 다시 찍는다.
- 이미지는 `docs/images/<name>.png` 에 저장되고 커밋 대상이다.

## 4. README 작성 형식

각 기능은 `## 기능과 사용 방법` 아래 번호 붙은 `###` 절로 쓴다.

```markdown
### N. 기능 이름 — `/경로`

한두 문장: 이 화면이 무엇을 하는지.

1. 사용 순서(버튼·입력 이름은 화면 표기 그대로 `코드 서식`)
2. ...

- 결과·표시 항목 설명, 주의점(지연 시세, 제외되는 데이터 등)

![기능 이름](docs/images/<name>.png)
```

- 화면에 보이는 문구를 그대로 쓴다 (예: `백테스트 실행`, `관심 추가 ★`).
- 아직 목업이거나 미완성인 기능은 그렇다고 **명시**한다. 동작하지 않는 것을 동작하는 것처럼 쓰지 않는다.
- 이미지 경로는 README 기준 상대 경로 `docs/images/...`.
- 나머지 절(로컬 실행 · 구성 · 전략 점수 모델 · API · 테스트 · 알려진 문제 · 로드맵 · README 스크린샷 갱신)도 변경 사항에 맞춰 갱신한다.

## 5. 검증과 커밋

```bash
grep -o "docs/images/[a-z0-9-]*\.png" README.md | sort -u | while read f; do [ -f "$f" ] || echo "MISSING $f"; done
```

- 참조 이미지가 모두 있는지, 사용하지 않는 이미지가 남지 않았는지 확인한다.
- 커밋: `[Update] README ...` 에 README·`docs/images`·스크립트 변경을 함께 담는다.
