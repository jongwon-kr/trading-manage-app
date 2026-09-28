"""MarketDataService: 시세 데이터의 단일 진입점 (FastAPI 와 분석 worker 가 공유).

공급자 폴백 체인, 조회 기간 계산, Redis 캐시(TTL 정책)를 여기서 담당한다.
"""
import logging
import math
from datetime import date, datetime, timedelta, timezone

import pandas as pd

from app.core.cache import get_json, get_or_load, set_json
from app.core.errors import BadRequest, IntervalNotSupported
from app.core.market_hours import is_market_open, market_status
from app.market.models import (DAILY_OR_LONGER, INTERVAL_SECONDS, SUPPORTED_INTERVALS, Fundamentals, Market,
                               Quote, SymbolInfo, make_quote)
from app.market.normalize import frame_to_rows, now_ms, resample, rows_to_frame
from app.market.providers.base import Provider, first_success
from app.market.providers.fdr_provider import FdrProvider
from app.market.providers.macro_provider import MacroProvider
from app.market.providers.naver_provider import NaverProvider
from app.market.providers.pykrx_provider import PykrxProvider
from app.market.providers.upbit_provider import UpbitProvider
from app.market.providers.yfinance_provider import YfinanceProvider
from app.market.symbols import SymbolMaster

logger = logging.getLogger(__name__)

MAX_LIMIT = 2000
# yfinance 분봉 최대 조회 기간(일)
_YF_LOOKBACK_DAYS = {"1m": 7, "5m": 59, "15m": 59, "30m": 59, "1h": 729, "4h": 729}
# 주식은 하루 6.5시간·주 5일만 거래 → 분봉 개수로 기간을 역산할 때 곱하는 계수
_STOCK_INTRADAY_FACTOR = 24 / 6.5 * 7 / 5

# 지수: (표시 코드, 이름, 관련 시장, yfinance 티커, 통화)
INDICES = [
    ("KOSPI", "코스피", Market.KR_STOCK, "^KS11", "KRW"),
    ("KOSDAQ", "코스닥", Market.KR_STOCK, "^KQ11", "KRW"),
    ("SPX", "S&P 500", Market.US_STOCK, "^GSPC", "USD"),
    ("IXIC", "나스닥 종합", Market.US_STOCK, "^IXIC", "USD"),
    ("VIX", "VIX 변동성", Market.US_STOCK, "^VIX", ""),
    ("USDKRW", "원/달러 환율", Market.KR_STOCK, "KRW=X", "KRW"),
]
OVERVIEW_CRYPTO = ["KRW-BTC", "KRW-ETH"]


def parse_key(key: str) -> tuple[Market, str]:
    """'KR_STOCK:005930' → (Market.KR_STOCK, '005930')"""
    try:
        m, code = key.split(":", 1)
        return Market(m), code
    except ValueError:
        raise BadRequest(f"잘못된 종목 키: {key} (형식: MARKET:CODE)")


class MarketDataService:
    def __init__(self):
        self.fdr = FdrProvider()
        self.pykrx = PykrxProvider()
        self.naver = NaverProvider()
        self.yf = YfinanceProvider()
        self.upbit = UpbitProvider()
        self.macro = MacroProvider()
        self._http = Provider()  # 정적 파일(심볼 디렉터리) 다운로드용
        self.symbols = SymbolMaster(self.fdr, self.upbit, self._http)

    # ================= 심볼 =================
    def search(self, q: str, market: Market | None, limit: int) -> list[SymbolInfo]:
        return self.symbols.search(q, market, limit)

    def get_symbol(self, market: Market, code: str) -> SymbolInfo:
        return self.symbols.get(market, code)

    # ================= 캔들 =================
    def get_candles(self, market: Market, code: str, interval: str, start: datetime | None = None,
                    end: datetime | None = None, limit: int = 300) -> tuple[pd.DataFrame, str, bool]:
        """(DataFrame[open,high,low,close,volume], source, delayed). 인덱스는 UTC 봉 시작 시각."""
        if interval not in SUPPORTED_INTERVALS[market]:
            raise IntervalNotSupported(
                f"{market.value} 는 {interval} 봉을 지원하지 않습니다. 지원: {', '.join(SUPPORTED_INTERVALS[market])}")
        if not 1 <= limit <= MAX_LIMIT:
            raise BadRequest(f"limit 은 1~{MAX_LIMIT} 사이여야 합니다.")
        if start and end and start >= end:
            raise BadRequest("from 은 to 보다 이전이어야 합니다.")
        sym = self.symbols.get(market, code)

        key = (f"mkt:candles:{market.value}:{sym.code}:{interval}:"
               f"{_ts(start)}:{_ts(end)}:{limit}")
        cached = get_or_load(key, self._candle_ttl(market, interval),
                             lambda: self._load_candles(sym, interval, start, end, limit))
        df = rows_to_frame(cached["rows"])
        return df, cached["source"], cached["delayed"]

    def _load_candles(self, sym: SymbolInfo, interval: str, start, end, limit) -> dict:
        if sym.market == Market.CRYPTO:
            df = self.upbit.candles(sym.code, interval, start, end, limit)
            source, delayed = self.upbit.name, False
        elif interval in DAILY_OR_LONGER:
            df, source = self._stock_daily(sym, interval, start, end, limit)
            delayed = source == self.yf.name
        else:
            df, source = self._stock_intraday(sym, interval, start, end, limit)
            delayed = True
        if start is None:
            df = df.tail(limit)
        return {"rows": frame_to_rows(df), "source": source, "delayed": delayed}

    def _stock_daily(self, sym: SymbolInfo, interval: str, start, end, limit) -> tuple[pd.DataFrame, str]:
        days_per_bar = {"1d": 1.5, "1w": 7.3, "1M": 31}[interval]
        end_d = end.date() if end else None
        start_d = start.date() if start else (end_d or date.today()) - timedelta(days=math.ceil(limit * days_per_bar) + 10)
        yf_ticker = self._yf_ticker(sym)
        yf_interval = "1d" if sym.market == Market.KR_STOCK else interval  # KR 은 일봉을 받아 재집계

        chain: list = []
        if sym.market == Market.KR_STOCK:
            chain += [(self.fdr, lambda: self.fdr.daily_candles(sym.code, start_d, end_d)),
                      (self.pykrx, lambda: self.pykrx.daily_candles(sym.code, start_d, end_d))]
        chain.append((self.yf, lambda: self.yf.candles(yf_ticker, yf_interval, _dt(start_d), _dt(end_d))))
        if sym.market == Market.US_STOCK:
            chain.append((self.fdr, lambda: self.fdr.daily_candles(sym.code, start_d, end_d)))

        df, source = first_success(chain, f"{sym.key} {interval} 캔들")
        # 일봉 소스(fdr/pykrx, US fdr 폴백)는 주/월봉으로 재집계
        if interval != "1d" and not (source == self.yf.name and yf_interval == interval):
            df = resample(df, interval)
        return df, source

    def _stock_intraday(self, sym: SymbolInfo, interval: str, start, end, limit) -> tuple[pd.DataFrame, str]:
        now = datetime.now(timezone.utc)
        earliest = now - timedelta(days=_YF_LOOKBACK_DAYS[interval])
        if start is None:
            span = timedelta(seconds=INTERVAL_SECONDS[interval] * limit * _STOCK_INTRADAY_FACTOR)
            start = (end or now) - span - timedelta(days=3)
        start = max(start, earliest)
        ticker = self._yf_ticker(sym)
        return first_success([(self.yf, lambda: self.yf.candles(ticker, interval, start, end))],
                             f"{sym.key} {interval} 캔들")

    def _candle_ttl(self, market: Market, interval: str) -> int:
        if interval == "1m":
            return 20
        if interval in ("5m", "15m", "30m"):
            return 60
        if interval in ("1h", "4h"):
            return 300
        if interval == "1d":
            return 600 if is_market_open(market) else 21_600
        return 21_600

    @staticmethod
    def _yf_ticker(sym: SymbolInfo) -> str:
        if sym.market == Market.KR_STOCK:
            return f"{sym.code}.KQ" if sym.exchange.startswith("KOSDAQ") else f"{sym.code}.KS"
        return sym.code

    # ================= 시세 =================
    def get_quote(self, market: Market, code: str) -> Quote:
        quotes = self.get_quotes([f"{market.value}:{code}"])
        if not quotes:
            raise BadRequest(f"시세를 가져오지 못했습니다: {market.value}:{code}")
        return quotes[0]

    def get_quotes(self, keys: list[str]) -> list[Quote]:
        """여러 시장 종목을 한 번에. 시장별로 묶어 배치 조회하고 종목별로 캐시한다."""
        if len(keys) > 50:
            raise BadRequest("한 번에 최대 50개 종목까지 조회할 수 있습니다.")
        parsed = [parse_key(k) for k in keys]
        syms = {f"{m.value}:{c}": self.symbols.get(m, c) for m, c in parsed}

        result: dict[str, Quote] = {}
        missing: dict[Market, list[SymbolInfo]] = {}
        for key, sym in syms.items():
            cached = get_json(f"mkt:quote:{sym.key}")
            if cached:
                result[key] = Quote.model_validate(cached)
            else:
                missing.setdefault(sym.market, []).append(sym)

        for market, symbols in missing.items():
            try:
                fetched = self._fetch_quotes(market, symbols)
            except Exception as e:
                logger.warning(f"시세 조회 실패: {market.value} {[s.code for s in symbols]}: {e}")
                continue
            ttl = {Market.KR_STOCK: 20, Market.US_STOCK: 30, Market.CRYPTO: 3}[market]
            for q in fetched:
                sym = syms.get(q.key)
                if sym:
                    q.name = q.name or sym.name
                    q.currency = q.currency or sym.currency
                set_json(f"mkt:quote:{q.key}", q.dump(), ttl)
                result[q.key] = q
        return [result[k] for k in syms if k in result]

    def _fetch_quotes(self, market: Market, symbols: list[SymbolInfo]) -> list[Quote]:
        codes = [s.code for s in symbols]
        if market == Market.CRYPTO:
            # 스트리머(py-stream)가 쓰는 스냅샷이 10초 이내면 그대로 사용
            fresh, stale = [], []
            for code in codes:
                snap = get_json(f"quote:CRYPTO:{code}")
                if snap and now_ms() - snap.get("ts", 0) < 10_000:
                    fresh.append(Quote.model_validate(snap))
                else:
                    stale.append(code)
            return fresh + (self.upbit.quotes(stale) if stale else [])
        if market == Market.KR_STOCK:
            quotes, _ = first_success([
                (self.naver, lambda: self.naver.quotes(codes)),
                (self.fdr, lambda: self._quotes_from_daily(symbols)),
            ], "KR 시세")
            return quotes
        quotes, _ = first_success([
            (self.yf, lambda: self.yf.quotes({s.code: s.code for s in symbols})),
            (self.fdr, lambda: self._quotes_from_daily(symbols)),
        ], "US 시세")
        return quotes

    def _quotes_from_daily(self, symbols: list[SymbolInfo]) -> list[Quote]:
        """최후 폴백: 최근 일봉 2개로 시세 추정 (stale)"""
        out = []
        for s in symbols:
            df = self.fdr.daily_candles(s.code, date.today() - timedelta(days=10), None)
            if df.empty:
                continue
            last = df.iloc[-1]
            prev = float(df["close"].iloc[-2]) if len(df) > 1 else None
            out.append(make_quote(s.market, s.code, float(last["close"]), prev, s.currency,
                                  int(df.index[-1].timestamp() * 1000), self.fdr.name, name=s.name,
                                  open=float(last["open"]), high=float(last["high"]), low=float(last["low"]),
                                  volume=float(last["volume"]), delayed=True))
        return out

    # ================= 재무 =================
    def get_fundamentals(self, market: Market, code: str) -> Fundamentals:
        if market == Market.CRYPTO:
            raise BadRequest("암호화폐는 재무 지표를 제공하지 않습니다.")
        sym = self.symbols.get(market, code)
        ticker = self._yf_ticker(sym)

        def load() -> dict:
            chain = []
            if market == Market.KR_STOCK:
                chain.append((self.naver, lambda: self.naver.fundamentals(sym.code)))
            chain.append((self.yf, lambda: self.yf.fundamentals(ticker, market, sym.code)))
            f, _ = first_success(chain, f"{sym.key} 재무")
            return f.dump()

        return Fundamentals.model_validate(get_or_load(f"mkt:fund:{sym.key}", 86_400, load))

    # ================= 시장 개요 =================
    def get_overview(self) -> dict:
        return get_or_load("mkt:overview", 60, self._load_overview)

    def _load_overview(self) -> dict:
        indices: list[dict] = []
        try:
            frames = self.yf.daily_closes([t for *_, t, _ in INDICES], period="3mo")
        except Exception as e:
            logger.warning(f"지수 일봉 조회 실패: {e}")
            frames = {}
        try:
            kr_live = {q.code: q for q in self.naver.index_quotes(["KOSPI", "KOSDAQ"])}
        except Exception as e:
            logger.warning(f"네이버 지수 조회 실패: {e}")
            kr_live = {}

        for code, name, market, ticker, currency in INDICES:
            df = frames.get(ticker)
            spark = df["close"].tail(30).round(4).tolist() if df is not None and not df.empty else []
            q = kr_live.get(code)
            if q is None and df is not None and len(df) >= 2:
                q = make_quote(market, code, float(df["close"].iloc[-1]), float(df["close"].iloc[-2]), currency,
                               int(df.index[-1].timestamp() * 1000), self.yf.name, delayed=True)
            if q is None:
                continue
            q.key, q.name, q.currency = f"INDEX:{code}", name, currency
            indices.append({**q.dump(), "sparkline": spark})

        for code in OVERVIEW_CRYPTO:
            try:
                q = self.get_quote(Market.CRYPTO, code)
                df, _, _ = self.get_candles(Market.CRYPTO, code, "1d", limit=30)
                indices.append({**q.dump(), "sparkline": df["close"].round(4).tolist()})
            except Exception as e:
                logger.warning(f"코인 개요 조회 실패: {code}: {e}")

        try:
            fg = self.macro.fear_greed(1)
            fear_greed = fg[0] if fg else None
        except Exception:
            fear_greed = None
        try:
            btc_dominance = self.macro.btc_dominance()
        except Exception:
            btc_dominance = None

        return {
            "indices": indices,
            "marketStatus": {m.value: market_status(m) for m in Market},
            "fearGreed": fear_greed,
            "btcDominance": btc_dominance,
            "asOf": now_ms(),
        }

    # ================= 상승/하락/거래대금 상위 =================
    def get_movers(self, market: Market, limit: int = 10) -> dict:
        limit = max(1, min(limit, 30))
        return get_or_load(f"mkt:movers:{market.value}:{limit}", 60, lambda: self._load_movers(market, limit))

    def _load_movers(self, market: Market, limit: int) -> dict:
        if market == Market.KR_STOCK:
            quotes = self._kr_snapshot_quotes()
            active = sorted(quotes, key=lambda q: q.trade_value or 0, reverse=True)
        elif market == Market.US_STOCK:
            return {"gainers": [q.dump() for q in self.yf.screen("day_gainers", limit)],
                    "losers": [q.dump() for q in self.yf.screen("day_losers", limit)],
                    "mostActive": [q.dump() for q in self.yf.screen("most_actives", limit)]}
        else:
            quotes = self.upbit.quotes([s.code for s in self.symbols.all(Market.CRYPTO)])
            for q in quotes:
                q.name = (self.symbols.find(Market.CRYPTO, q.code) or q).name
            active = sorted(quotes, key=lambda q: q.trade_value or 0, reverse=True)
        by_rate = sorted(quotes, key=lambda q: q.change_rate, reverse=True)
        return {"gainers": [q.dump() for q in by_rate[:limit]],
                "losers": [q.dump() for q in reversed(by_rate[-limit:])],
                "mostActive": [q.dump() for q in active[:limit]]}

    def _kr_snapshot_quotes(self) -> list[Quote]:
        """KRX 상장목록의 당일 시세 스냅샷 (거래 정지 종목 제외)"""
        df = self.fdr.krx_listing()
        df = df[(df["Volume"] > 0) & df["Market"].isin(["KOSPI", "KOSDAQ", "KOSDAQ GLOBAL"])]
        ts = now_ms()
        return [make_quote(Market.KR_STOCK, str(r.Code), float(r.Close), float(r.Close - r.Changes), "KRW", ts,
                           self.fdr.name, name=str(r.Name), open=float(r.Open), high=float(r.High), low=float(r.Low),
                           volume=float(r.Volume), trade_value=float(r.Amount), delayed=True)
                for r in df.itertuples()]


def _ts(d: datetime | None) -> str:
    return str(int(d.timestamp())) if d else "-"


def _dt(d: date | None) -> datetime | None:
    return datetime(d.year, d.month, d.day, tzinfo=timezone.utc) if d else None


_service: MarketDataService | None = None


def get_service() -> MarketDataService:
    global _service
    if _service is None:
        _service = MarketDataService()
    return _service
