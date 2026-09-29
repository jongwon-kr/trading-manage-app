/**
 * README 스크린샷 자동 캡처.
 *
 *   cd frontend && npm run docs:screenshots            # 전체
 *   npm run docs:screenshots -- dashboard backtest       # 이름으로 일부만
 *
 * 전제: 인프라(docker compose), Java(:8080), Python API·worker·stream, Vite(:5173)가 떠 있어야 한다.
 * 데모 계정(README_EMAIL)이 없으면 만들고, 관심종목·매매일지·내 전략·커뮤니티 글을 시드한 뒤 docs/images/*.png 로 저장한다.
 * 커뮤니티 댓글·좋아요·팔로우 알림용으로 두 번째 계정(README_FRIEND_EMAIL)도 만든다.
 * 브라우저는 설치된 Chrome 을 쓴다 (없으면 CHROME_PATH 로 실행 파일 지정).
 *
 * 새 기능을 README 에 추가할 때는 아래 SHOTS 배열에 항목을 추가한다.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const APP = process.env.APP_URL ?? "http://localhost:5173";
const API = process.env.API_URL ?? "http://localhost:8080/api";
const EMAIL = process.env.README_EMAIL ?? "readme-demo@example.com";
const PASSWORD = process.env.README_PASSWORD ?? "Passw0rd!";
const FRIEND_EMAIL = process.env.README_FRIEND_EMAIL ?? "readme-friend@example.com";
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../docs/images");
const VIEWPORT = { width: 1440, height: 900 };

// ---------------------------------------------------------------- 화면 정의
// name: 파일명(docs/images/<name>.png) · path: 이동할 URL · ready: 캡처 전 기다릴 조건
// prepare: 이동 후 조작 · element: 특정 영역만 캡처 · fullPage · theme: "dark" 이면 다크 모드
// path 는 함수일 수 있다: 시드 결과(ctx: presetId, strategyPostId, journalPostId)로 주소를 만든다
// 본문은 창이 아니라 레이아웃 내부 컨테이너가 스크롤하므로 요소를 맨 위로 올린다
const scrollTo = (text) => async (page) => {
  await page.locator(`text=${text}`).first().evaluate((el) => el.scrollIntoView({ block: "start" }));
};
const SHOTS = [
  { name: "login", path: "/login", auth: false, ready: "text=로그인" },
  { name: "dashboard", path: "/dashboard", ready: "text=국내 주식은", settle: 4000 },
  { name: "market", path: "/market", ready: "text=상승률 상위", settle: 3000 },
  {
    name: "search",
    path: "/market",
    ready: "text=상승률 상위",
    prepare: async (page) => {
      await page.getByRole("button", { name: /종목 검색/ }).click();
      await page.fill("[cmdk-input]", "삼성");
      await page.waitForSelector("[cmdk-item]");
    },
  },
  { name: "symbol-detail", path: "/market/kr/005930", ready: "text=신뢰도", settle: 2500 },
  { name: "strategy-report", path: "/market/kr/005930", ready: "#strategy-report", element: "#strategy-report" },
  {
    name: "crypto-realtime-dark",
    path: "/market/crypto/KRW-BTC?interval=1m",
    theme: "dark",
    ready: "header >> text=실시간",
    settle: 5000,
  },
  { name: "analysis", path: "/analysis?market=us&symbol=AAPL", ready: "text=팩터 상세", fullPage: true, settle: 2000 },
  {
    name: "factor-explain",
    path: "/analysis?market=kr&symbol=005930",
    ready: "text=팩터 상세",
    prepare: async (page) => {
      await page.locator("tr", { hasText: "RSI(" }).first().click();
      await page.waitForSelector("text=밴드: 입력값 → 점수");
    },
    settle: 1500,
  },
  { name: "methodology", path: "/analysis/methodology", ready: "text=점수는 이렇게 계산됩니다", settle: 1500 },
  { name: "strategies", path: "/strategies", ready: "text=모멘텀 강화", settle: 800 },
  {
    name: "strategy-editor",
    path: (ctx) => `/strategies/${ctx.presetId}`,
    ready: "text=기술적 분석 · 모멘텀",
    prepare: async (page) => {
      await page.getByRole("button", { name: "이 설정으로 분석" }).click();
      await page.waitForSelector("text=기여도가 달라진 팩터", { timeout: 90_000 });
    },
    settle: 1200,
  },
  { name: "strategy-band", path: (ctx) => `/strategies/${ctx.presetId}`, ready: "#edit-rsi", element: "#edit-rsi", settle: 800 },
  {
    name: "backtest",
    path: "/backtest?market=kr&symbol=005930",
    ready: "text=삼성전자 (005930)",
    prepare: async (page) => {
      await page.getByRole("button", { name: "백테스트 실행" }).click();
      await page.waitForSelector("text=자산 곡선", { timeout: 90_000 });
    },
    fullPage: true,
    settle: 2500,
  },
  {
    name: "backtest-compare",
    path: (ctx) => `/backtest?market=kr&symbol=005930&preset=${ctx.presetId}&compare=1`,
    ready: "text=기본 모델과 비교",
    prepare: async (page) => {
      await page.getByRole("button", { name: "백테스트 실행" }).click();
      await page.waitForSelector("text=기본 모델 대비", { timeout: 150_000 });
      await scrollTo("자산 곡선")(page);
    },
    settle: 2500,
  },
  { name: "trends", path: "/trends?market=kr", ready: "text=주도 섹터 순위", settle: 2500 },
  { name: "trends-sectors", path: "/trends?market=kr", ready: "text=주도 섹터 순위", prepare: scrollTo('"섹터 로테이션"'), settle: 2500 },
  { name: "trends-crypto", path: "/trends?market=crypto", ready: "text=코인 카테고리 (24시간)", prepare: scrollTo("상승 종목 비율"), settle: 2000 },
  { name: "watchlist", path: "/watchlist", ready: "tbody tr", settle: 4000 },
  { name: "journal", path: "/journal", ready: "text=거래 기록 (", settle: 1500 },
  {
    name: "journal-form",
    path: "/journal",
    ready: "text=거래 기록 (",
    prepare: async (page) => {
      await page.getByRole("button", { name: /새 거래 기록/ }).click();
      await page.waitForSelector("text=매매 근거 및 분석");
    },
  },
  {
    name: "journal-share",
    path: "/journal",
    ready: "text=거래 기록 (",
    prepare: async (page) => {
      await page.getByRole("button", { name: "상세보기" }).first().click();
      await page.getByRole("button", { name: "커뮤니티에 공유" }).click();
      await page.waitForSelector("text=금액 가리기");
    },
  },
  { name: "community", path: "/community", ready: "text=RSI 강세 가점", settle: 1200 },
  { name: "community-strategy", path: (ctx) => `/community/${ctx.strategyPostId}`, ready: "text=내 전략으로 가져오기", settle: 1500 },
  { name: "community-journal", path: (ctx) => `/community/${ctx.journalPostId}`, ready: "text=매매 근거", settle: 1000 },
  {
    name: "notifications",
    path: "/community",
    ready: "text=RSI 강세 가점",
    prepare: async (page) => {
      await page.getByRole("button", { name: /^알림/ }).click();
      await page.waitForSelector("text=모두 읽음");
      await page.waitForSelector("text=댓글을 남겼습니다");
    },
    settle: 800,
  },
];

// ---------------------------------------------------------------- 데모 데이터
const WATCHLIST = [
  ["KR_STOCK", "005930"],
  ["KR_STOCK", "000660"],
  ["US_STOCK", "AAPL"],
  ["US_STOCK", "NVDA"],
  ["CRYPTO", "KRW-BTC"],
  ["CRYPTO", "KRW-ETH"],
];
const JOURNALS = [
  {
    market: "STOCK", symbol: "005930", tradeType: "LONG", quantity: 10, entryPrice: 265000, stopLossPrice: 243500,
    reasoning: { markdown: "<p>전략 점수 68점(매수). 20일선 지지 확인 후 진입.</p>", images: [] },
  },
  {
    market: "CRYPTO", symbol: "KRW-BTC", tradeType: "LONG", quantity: 0.0125, entryPrice: 110500000,
    stopLossPrice: 104000000, realizedPnL: 31250,
    reasoning: { markdown: "<p>ATR 2.5배 손절, 1.5R 목표 도달로 청산.</p>", images: [] },
  },
];

async function api(pathname, { method = "GET", token, body } = {}) {
  const res = await fetch(`${API}${pathname}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

async function preflight() {
  const checks = [
    [APP, "프론트(Vite) — cd frontend && npm run dev"],
    [`${API.replace(/\/api$/, "")}/actuator/health`, "Java — cd backend-java && ./gradlew bootRun"],
  ];
  for (const [url, hint] of checks) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    } catch (e) {
      throw new Error(`${url} 에 접속할 수 없습니다 (${e.message}). 먼저 실행하세요: ${hint}`);
    }
  }
}

/** 로그인 (없으면 가입) → access 토큰 */
async function signIn(email) {
  let res = await api("/auth/sign-in", { method: "POST", body: { email, password: PASSWORD } });
  if (!res.ok) {
    const signUp = await api("/users/sign-up", {
      method: "POST",
      body: { username: email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").slice(0, 20), email, password: PASSWORD },
    });
    if (!signUp.ok) throw new Error(`계정 생성 실패(${email}): ${signUp.status} ${await signUp.text()}`);
    res = await api("/auth/sign-in", { method: "POST", body: { email, password: PASSWORD } });
  }
  const token = res.headers.get("access");
  if (!token) throw new Error("로그인 응답에 access 헤더가 없습니다.");
  return token;
}

const json = async (r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status} ${await r.text()}`)));

// 데모 전략: 기본 모델에서 RSI 강세 구간 가점을 높이고 ATR 수준 팩터를 끈다
const DEMO_PRESET = {
  name: "모멘텀 강화",
  description: "RSI 50~70 강세 구간 가점을 높이고 변동성(ATR) 수준 팩터를 끈 전략",
  config: {
    factors: {
      rsi: { weight: 1, bands: { rsi: { xs: [20, 30, 50, 65, 75, 85], ys: [0.2, -0.2, 0, 1, 0.3, -0.6] } } },
      atr_regime: { enabled: false },
    },
  },
};

async function pollResult(id, token) {
  for (let i = 0; i < 120; i++) {
    const r = await json(await api(`/v1/analysis/result/${id}`, { token }));
    if (r.status === "SUCCESS" || r.status === "FAILED") return r;
    await new Promise((res) => setTimeout(res, 1500));
  }
  throw new Error("백테스트 시간 초과");
}

async function ensureAccountAndSeed() {
  const token = await signIn(EMAIL);

  for (const [market, code] of WATCHLIST) {
    const r = await api("/v1/watchlist/items", { method: "POST", token, body: { market, code } });
    if (!r.ok && r.status !== 409) console.warn(`  관심종목 추가 실패 ${market}:${code} → ${r.status}`);
  }
  const existing = await (await api("/journals?page=0&size=1", { token })).json();
  if (!existing.totalElements) {
    for (const j of JOURNALS) {
      const r = await api("/journals", { method: "POST", token, body: j });
      if (!r.ok) console.warn(`  매매일지 시드 실패 ${j.symbol} → ${r.status}`);
    }
  }

  // 내 전략
  const presets = await json(await api("/v1/strategies", { token }));
  let preset = presets.find((p) => p.name === DEMO_PRESET.name);
  preset = preset
    ? await json(await api(`/v1/strategies/${preset.id}`, { method: "PUT", token, body: DEMO_PRESET })) // 설명·설정을 데모 값으로 맞춘다
    : await json(await api("/v1/strategies", { method: "POST", token, body: DEMO_PRESET }));

  // 커뮤니티: 전략 공유(백테스트 성과 첨부)·일지 공유가 없으면 만든다
  const me = await json(await api("/users/me", { token }));
  const mine = (await json(await api(`/contents?author=${encodeURIComponent(me.username)}&size=50`, { token }))).content;
  let strategyPost = mine.find((c) => c.attachmentType === "STRATEGY");
  if (!strategyPost) {
    const bt = await json(await api("/v1/analysis/backtest", { method: "POST", token,
      body: { market: "KR_STOCK", symbol: "005930", presetId: preset.id } }));
    await pollResult(bt.requestId, token);
    strategyPost = await json(await api(`/v1/strategies/${preset.id}/share`, { method: "POST", token, body: {
      title: "모멘텀 강화 — RSI 강세 가점 전략", backtestRequestId: bt.requestId,
      body: "<p>RSI 65 부근 가점을 높이고 ATR 수준 팩터를 껐습니다. 삼성전자 3년 백테스트 성과를 첨부합니다.</p>",
    } }));
  }
  let journalPost = mine.find((c) => c.attachmentType === "JOURNAL");
  if (!journalPost) {
    const journals = await json(await api("/journals?page=0&size=10", { token }));
    const j = journals.content.find((x) => x.symbol === "005930") ?? journals.content[0];
    journalPost = await json(await api(`/journals/${j.id}/share`, { method: "POST", token, body: {
      title: "삼성전자 20일선 지지 매수 기록", body: "<p>전략 점수 68점에서 진입했습니다.</p>", hideAmounts: true,
    } }));
  }

  // 친구 계정: 팔로우·질문 글·댓글·좋아요 (데모 계정 알림용)
  const friend = await signIn(FRIEND_EMAIL);
  await api(`/users/${encodeURIComponent(me.username)}/follow`, { method: "POST", token: friend });
  const post = await json(await api(`/contents/${strategyPost.id}`, { token: friend }));
  if (!post.comments.some((c) => c.mine)) { // 친구가 아직 댓글을 달지 않았으면
    await api(`/contents/${strategyPost.id}/comments`, { method: "POST", token: friend,
      body: { comment: "가져와서 SK하이닉스로도 돌려 봤는데 MDD 가 더 작네요. 좋은 전략 감사합니다!" } });
    await api(`/contents/${strategyPost.id}/like`, { method: "POST", token: friend });
    await api(`/v1/strategies/import/${strategyPost.id}`, { method: "POST", token: friend });
    await api("/contents", { method: "POST", token: friend, body: { category: "QNA",
      title: "백테스트 기간은 몇 년이 적당할까요?", body: "<p>3년과 5년 결과가 꽤 다른데, 어느 쪽을 믿어야 할지 궁금합니다.</p>" } });
  }
  return { presetId: preset.id, strategyPostId: strategyPost.id, journalPostId: journalPost.id };
}

async function launch() {
  const opts = { headless: true };
  try {
    return await chromium.launch(process.env.CHROME_PATH ? { ...opts, executablePath: process.env.CHROME_PATH } : { ...opts, channel: "chrome" });
  } catch (e) {
    throw new Error(`Chrome 을 실행할 수 없습니다. CHROME_PATH 로 chrome.exe 경로를 지정하세요. (${e.message})`);
  }
}

async function newContext(browser) {
  // 테마는 next-themes 저장값(localStorage "theme")으로 고정해 OS 설정과 무관하게 같은 화면을 얻는다
  return browser.newContext({ viewport: VIEWPORT, locale: "ko-KR", colorScheme: "light" });
}

async function login(page) {
  await page.goto(`${APP}/login`);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15_000 });
}

async function main() {
  const only = process.argv.slice(2);
  const shots = only.length ? SHOTS.filter((s) => only.includes(s.name)) : SHOTS;
  if (!shots.length) throw new Error(`알 수 없는 화면 이름: ${only.join(", ")} (가능: ${SHOTS.map((s) => s.name).join(", ")})`);

  await preflight();
  console.log(`데모 계정 준비: ${EMAIL}`);
  const ctx = await ensureAccountAndSeed();
  await mkdir(OUT, { recursive: true });

  const browser = await launch();
  // 로그인 세션은 하나만 쓴다: 같은 계정으로 두 번 로그인하면 Redis 의 리프레시 토큰이 교체되어
  // 먼저 만든 세션이 새로고침(세션 복구) 시 로그아웃된다. 테마는 캡처마다 저장값을 바꿔 적용한다.
  const guest = await (await newContext(browser)).newPage();
  const member = await (await newContext(browser)).newPage();
  await login(member);
  const failures = [];
  try {
    for (const shot of shots) {
      const page = shot.auth === false ? guest : member;
      try {
        await page.goto(`${APP}/`, { waitUntil: "commit" }).catch(() => {});
        await page.evaluate((t) => localStorage.setItem("theme", t), shot.theme ?? "light");
        await page.goto(`${APP}${typeof shot.path === "function" ? shot.path(ctx) : shot.path}`);
        await page.waitForSelector(shot.ready, { timeout: 60_000 });
        if (shot.prepare) await shot.prepare(page);
        await page.waitForTimeout(shot.settle ?? 1000); // 차트·애니메이션 안정화
        const file = path.join(OUT, `${shot.name}.png`);
        if (shot.element) await page.locator(shot.element).screenshot({ path: file });
        else await page.screenshot({ path: file, fullPage: !!shot.fullPage });
        console.log(`✓ ${shot.name}`);
        if (shot.prepare) await page.keyboard.press("Escape");
      } catch (e) {
        failures.push(shot.name);
        console.error(`✗ ${shot.name}: ${e.message.split("\n")[0]}`);
      }
    }
  } finally {
    await browser.close();
  }
  console.log(`\n저장 위치: ${OUT}`);
  if (failures.length) {
    console.error(`실패: ${failures.join(", ")}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(`\n${e.message}`);
  process.exit(1);
});
