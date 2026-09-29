from datetime import datetime

from app.market.models import Fundamentals, Market, Quote, make_quote
from app.market.providers.base import Provider, parse_korean_amount, parse_number

_POLL = "https://polling.finance.naver.com/api/realtime/domestic"
_MOBILE = "https://m.stock.naver.com/api/stock"
_MOBILE_LIST = "https://m.stock.naver.com/api/stocks"  # 업종·테마 목록
_CHUNK = 20


def _field(d: dict, name: str) -> float | None:
    """네이버 응답은 'closePrice': '273,000' 과 (일부) 'closePriceRaw': '273000' 을 함께 준다."""
    raw = d.get(f"{name}Raw")
    return parse_number(raw if raw is not None else d.get(name))


class NaverProvider(Provider):
    """네이버 금융(비공식): KR 준실시간 시세, 지수, 종목 재무지표"""

    name = "naver"
    min_interval = 0.2

    def quotes(self, codes: list[str]) -> list[Quote]:
        out: list[Quote] = []
        for i in range(0, len(codes), _CHUNK):
            data = self.get_json(f"{_POLL}/stock/{','.join(codes[i:i + _CHUNK])}")
            out += [self._to_quote(d, d["itemCode"], d.get("stockName")) for d in data.get("datas", [])]
        return out

    def index_quotes(self, codes: list[str]) -> list[Quote]:
        """codes: KOSPI, KOSDAQ"""
        data = self.get_json(f"{_POLL}/index/{','.join(codes)}")
        return [self._to_quote(d, d["itemCode"], d.get("stockName"), key_prefix="INDEX")
                for d in data.get("datas", [])]

    def groups(self, kind: str) -> list[dict]:
        """업종(kind=industry)·테마(kind=theme) 당일 등락. [{no, name, changeRate(비율), rise, fall, steady, total}]"""
        out, page = [], 1
        while page <= 5:
            data = self.get_json(f"{_MOBILE_LIST}/{kind}", page=page, pageSize=100)
            rows = data.get("groups", [])
            out += [{"no": g["no"], "name": g["name"], "changeRate": (parse_number(g.get("changeRate")) or 0.0) / 100,
                     "rise": g.get("riseCount", 0), "fall": g.get("fallCount", 0), "steady": g.get("steadyCount", 0),
                     "total": g.get("totalCount", 0)} for g in rows]
            if len(out) >= data.get("totalCount", 0) or len(rows) < 100:
                break
            page += 1
        return out

    def group_stocks(self, kind: str, no: int, size: int = 30) -> list[dict]:
        """업종·테마 구성 종목 (당일 등락률 순). tradeValue·marketCap 은 원 단위"""
        data = self.get_json(f"{_MOBILE_LIST}/{kind}/{no}", page=1, pageSize=size)
        return [{"code": s["itemCode"], "name": s.get("stockName"), "exchange": "KOSDAQ" if s.get("sosok") == "1" else "KOSPI",
                 "price": _field(s, "closePrice"), "changeRate": (parse_number(s.get("fluctuationsRatio")) or 0.0) / 100,
                 "tradeValue": _field(s, "accumulatedTradingValue"), "marketCap": _field(s, "marketValue")}
                for s in data.get("stocks", [])]

    def _to_quote(self, d: dict, code: str, name: str | None, key_prefix: str | None = None) -> Quote:
        price = _field(d, "closePrice")
        diff = _field(d, "compareToPreviousClosePrice") or 0.0
        traded_at = d.get("localTradedAt")
        ts = int(datetime.fromisoformat(traded_at).timestamp() * 1000) if traded_at else 0
        volume = parse_number(d.get("accumulatedTradingVolumeRaw")) or parse_number(d.get("accumulatedTradingVolume"))
        value_raw = d.get("accumulatedTradingValueRaw")
        trade_value = parse_number(value_raw) if value_raw else parse_korean_amount(d.get("accumulatedTradingValue"))
        q = make_quote(Market.KR_STOCK, code, price, price - diff, "KRW", ts, self.name, name=name,
                       open=_field(d, "openPrice"), high=_field(d, "highPrice"), low=_field(d, "lowPrice"),
                       volume=volume, acc_trade_volume=volume, trade_value=trade_value)
        if key_prefix:
            q.key = f"{key_prefix}:{code}"
        return q

    def fundamentals(self, code: str) -> Fundamentals:
        integ = self.get_json(f"{_MOBILE}/{code}/integration")
        infos = {i["code"]: i for i in integ.get("totalInfos") or []}

        def info(k: str) -> float | None:
            return parse_number(infos.get(k, {}).get("value"))

        dividend = info("dividendYieldRatio")
        market_cap = parse_korean_amount(infos.get("marketValue", {}).get("value"))

        annual = self._annual_rows(code)
        roe = _latest(annual.get("ROE"))
        op_margin = _latest(annual.get("영업이익률"))
        debt = _latest(annual.get("부채비율"))

        return Fundamentals(
            market=Market.KR_STOCK, code=code,
            per=info("per"), pbr=info("pbr"), eps=info("eps"), bps=info("bps"),
            roe=roe / 100 if roe is not None else None,
            operating_margin=op_margin / 100 if op_margin is not None else None,
            debt_to_equity=debt / 100 if debt is not None else None,
            dividend_yield=dividend / 100 if dividend is not None else None,
            eps_growth=_growth(annual.get("EPS")),
            revenue_growth=_growth(annual.get("매출액")),
            market_cap=market_cap,
            as_of=infos.get("per", {}).get("valueDesc"),
            source=self.name,
        )

    def _annual_rows(self, code: str) -> dict[str, list[float | None]]:
        """연간 재무 → {항목: [오래된 실적, ..., 최근 실적]} (컨센서스 추정치 제외)"""
        try:
            info = self.get_json(f"{_MOBILE}/{code}/finance/annual").get("financeInfo") or {}
        except Exception:
            return {}
        periods = [t["key"] for t in info.get("trTitleList", []) if t.get("isConsensus") != "Y"]
        rows = {}
        for row in info.get("rowList", []):
            cols = row.get("columns", {})
            rows[row["title"]] = [parse_number(cols.get(p, {}).get("value")) for p in periods]
        return rows


def _latest(values: list[float | None] | None) -> float | None:
    for v in reversed(values or []):
        if v is not None:
            return v
    return None


def _growth(values: list[float | None] | None) -> float | None:
    """최근 2개 실적 연도의 증가율. 기저가 0 이하이면 계산하지 않는다."""
    vals = [v for v in values or [] if v is not None]
    if len(vals) < 2 or vals[-2] <= 0:
        return None
    return vals[-1] / vals[-2] - 1
