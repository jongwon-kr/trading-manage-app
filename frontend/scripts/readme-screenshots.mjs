/**
 * README 스크린샷 자동 캡처.
 *
 *   cd frontend && npm run docs:screenshots            # 전체
 *   npm run docs:screenshots -- dashboard backtest       # 이름으로 일부만
 *
 * 전제: 인프라(docker compose), Java(:8080), Python API·worker·stream, Vite(:5173)가 떠 있어야 한다.
 * 데모 계정(README_EMAIL)이 없으면 만들고, 관심종목·매매일지를 시드한 뒤 docs/images/*.png 로 저장한다.
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
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../docs/images");
const VIEWPORT = { width: 1440, height: 900 };

// ---------------------------------------------------------------- 화면 정의
// name: 파일명(docs/images/<name>.png) · path: 이동할 URL · ready: 캡처 전 기다릴 조건
// prepare: 이동 후 조작 · element: 특정 영역만 캡처 · fullPage · theme: "dark" 이면 다크 모드
const SHOTS = [
  { name: "login", path: "/login", auth: false, ready: "text=로그인" },
  { name: "dashboard", path: "/dashboard", ready: "text=관심종목", settle: 4000 },
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

async function ensureAccountAndSeed() {
  let res = await api("/auth/sign-in", { method: "POST", body: { email: EMAIL, password: PASSWORD } });
  if (!res.ok) {
    const signUp = await api("/users/sign-up", {
      method: "POST",
      body: { username: EMAIL.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").slice(0, 20), email: EMAIL, password: PASSWORD },
    });
    if (!signUp.ok) throw new Error(`데모 계정 생성 실패: ${signUp.status} ${await signUp.text()}`);
    res = await api("/auth/sign-in", { method: "POST", body: { email: EMAIL, password: PASSWORD } });
  }
  const token = res.headers.get("access");
  if (!token) throw new Error("로그인 응답에 access 헤더가 없습니다.");

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
  await ensureAccountAndSeed();
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
        await page.goto(`${APP}${shot.path}`);
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
