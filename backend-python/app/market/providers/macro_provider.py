from app.market.providers.base import Provider


class MacroProvider(Provider):
    """시장 심리 지표: alternative.me 코인 공포탐욕지수, CoinGecko BTC 도미넌스"""

    name = "macro"
    min_interval = 1.0

    def fear_greed(self, limit: int = 1) -> list[dict]:
        """최신순 [{value:int, label:str, ts:epochSec}]. limit=0 이면 전체 이력."""
        data = self.get_json("https://api.alternative.me/fng/", limit=limit).get("data", [])
        return [{"value": int(d["value"]), "label": d["value_classification"], "ts": int(d["timestamp"])}
                for d in data]

    def btc_dominance(self) -> float | None:
        data = self.get_json("https://api.coingecko.com/api/v3/global").get("data", {})
        pct = data.get("market_cap_percentage", {}).get("btc")
        return pct / 100 if pct is not None else None
