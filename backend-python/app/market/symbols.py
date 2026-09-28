"""심볼 마스터: 시장별 종목 목록을 수집·캐시하고 검색한다.

- KR: FinanceDataReader KRX 상장목록
- US: NASDAQ Trader 심볼 디렉터리 (nasdaqlisted / otherlisted)
- CRYPTO: Upbit KRW 마켓

Redis(24h) → 디스크 스냅샷(data/symbols_{market}.json) → 원격 수집 순으로 로드한다.
"""
import logging
import re
import threading
from pathlib import Path

import orjson

from app.core.cache import get_json, set_json
from app.core.errors import ProviderUnavailable, SymbolNotFound
from app.market.models import Market, SymbolInfo
from app.market.providers.base import Provider

logger = logging.getLogger(__name__)

_TTL = 86_400
_DATA_DIR = Path(__file__).resolve().parents[2] / "data"
_NASDAQ_DIR = "https://www.nasdaqtrader.com/dynamic/SymDir"
_OTHER_EXCHANGES = {"N": "NYSE", "A": "AMEX", "P": "NYSEARCA", "Z": "BATS", "V": "IEX"}
_NAME_NOISE = re.compile(r"\s+(-\s+)?(Common Stock|Ordinary Shares|Class [A-C] Common Stock|Common Shares).*$", re.I)


class SymbolMaster:
    def __init__(self, fdr, upbit, http_provider: Provider):
        self._fdr = fdr
        self._upbit = upbit
        self._http = http_provider
        self._by_market: dict[Market, dict[str, SymbolInfo]] = {}
        self._lock = threading.Lock()

    # ---------- 조회 ----------
    def get(self, market: Market, code: str) -> SymbolInfo:
        sym = self._symbols(market).get(code.upper())
        if sym is None:
            raise SymbolNotFound(f"종목을 찾을 수 없습니다: {market.value}:{code}")
        return sym

    def find(self, market: Market, code: str) -> SymbolInfo | None:
        try:
            return self.get(market, code)
        except SymbolNotFound:
            return None

    def search(self, q: str, market: Market | None = None, limit: int = 20) -> list[SymbolInfo]:
        """순위: 코드 일치 > 코드 prefix > 이름 prefix > 이름/코드 부분일치"""
        needle = q.strip().casefold()
        if not needle:
            return []
        markets = [market] if market else list(Market)
        scored: list[tuple[int, int, SymbolInfo]] = []
        for m in markets:
            try:
                symbols = self._symbols(m).values()
            except ProviderUnavailable:
                continue
            for s in symbols:
                code = s.code.casefold()
                # 코인은 'KRW-BTC' 외에 'BTC' 로도 찾을 수 있게
                bare = code.split("-", 1)[-1]
                names = [s.name.casefold(), (s.name_en or "").casefold()]
                if needle in (code, bare):
                    rank = 0
                elif code.startswith(needle) or bare.startswith(needle):
                    rank = 1
                elif any(n.startswith(needle) for n in names):
                    rank = 2
                elif needle in code or any(needle in n for n in names):
                    rank = 3
                else:
                    continue
                scored.append((rank, len(s.name), s))
        scored.sort(key=lambda x: (x[0], x[1]))
        return [s for _, _, s in scored[:limit]]

    def all(self, market: Market) -> list[SymbolInfo]:
        return list(self._symbols(market).values())

    def warm_up(self) -> None:
        for m in Market:
            try:
                self._symbols(m)
            except Exception as e:
                logger.warning(f"심볼 마스터 warm-up 실패: {m.value}: {e}")

    # ---------- 로딩 ----------
    def _symbols(self, market: Market) -> dict[str, SymbolInfo]:
        cached = self._by_market.get(market)
        if cached is not None:
            return cached
        with self._lock:
            if market not in self._by_market:
                self._by_market[market] = {s.code.upper(): s for s in self._load(market)}
                logger.info(f"심볼 마스터 로드: {market.value} {len(self._by_market[market])}개")
        return self._by_market[market]

    def _load(self, market: Market) -> list[SymbolInfo]:
        key = f"symbols:{market.value}"
        rows = get_json(key)
        if rows:
            return [SymbolInfo.model_validate(r) for r in rows]
        disk = _DATA_DIR / f"symbols_{market.value}.json"
        try:
            symbols = self._fetch(market)
            dumped = [s.dump() for s in symbols]
            set_json(key, dumped, _TTL)
            _DATA_DIR.mkdir(exist_ok=True)
            disk.write_bytes(orjson.dumps(dumped))
            return symbols
        except Exception as e:
            if disk.exists():
                logger.warning(f"심볼 원격 수집 실패, 디스크 스냅샷 사용: {market.value}: {e}")
                return [SymbolInfo.model_validate(r) for r in orjson.loads(disk.read_bytes())]
            raise ProviderUnavailable(f"심볼 목록을 불러오지 못했습니다: {market.value}: {e}") from e

    def _fetch(self, market: Market) -> list[SymbolInfo]:
        if market == Market.KR_STOCK:
            return self._fetch_kr()
        if market == Market.US_STOCK:
            return self._fetch_us()
        return self._fetch_crypto()

    def _fetch_kr(self) -> list[SymbolInfo]:
        df = self._fdr.krx_listing()
        return [SymbolInfo(market=Market.KR_STOCK, exchange=str(r.Market), code=str(r.Code), name=str(r.Name),
                           currency="KRW", price_precision=0)
                for r in df.itertuples() if r.Market in ("KOSPI", "KOSDAQ", "KOSDAQ GLOBAL", "KONEX")]

    def _fetch_us(self) -> list[SymbolInfo]:
        out: list[SymbolInfo] = []
        for line in self._text(f"{_NASDAQ_DIR}/nasdaqlisted.txt")[1:]:
            f = line.split("|")
            if len(f) < 7 or f[3] != "N":  # Test Issue 제외
                continue
            out.append(self._us_symbol(f[0], f[1], "NASDAQ"))
        for line in self._text(f"{_NASDAQ_DIR}/otherlisted.txt")[1:]:
            f = line.split("|")
            if len(f) < 7 or f[6] != "N":
                continue
            out.append(self._us_symbol(f[0], f[1], _OTHER_EXCHANGES.get(f[2], f[2])))
        # 우선주·워런트 등 특수 심볼($, .WS 등) 제외
        return [s for s in out if s.code and "$" not in s.code]

    def _us_symbol(self, raw: str, name: str, exchange: str) -> SymbolInfo:
        code = raw.strip().replace(".", "-")  # BRK.B → BRK-B (yfinance 표기)
        return SymbolInfo(market=Market.US_STOCK, exchange=exchange, code=code,
                          name=_NAME_NOISE.sub("", name).strip() or name, currency="USD", price_precision=2)

    def _text(self, url: str) -> list[str]:
        self._http.limiter.wait()
        res = self._http.http.get(url, timeout=20)
        res.raise_for_status()
        return [l for l in res.text.splitlines() if l and not l.startswith("File Creation Time")]

    def _fetch_crypto(self) -> list[SymbolInfo]:
        out = []
        for m in self._upbit.markets():
            event = m.get("market_event") or {}
            cautions = [k for k, v in (event.get("caution") or {}).items() if v]
            warning = "WARNING" if event.get("warning") or m.get("market_warning") == "CAUTION" else (
                "CAUTION" if cautions else None)
            out.append(SymbolInfo(market=Market.CRYPTO, exchange="UPBIT", code=m["market"], name=m["korean_name"],
                                  name_en=m.get("english_name"), currency="KRW", warning=warning))
        return out
