"""섹터(업종) 추세 계산용 대표 ETF 목록.

- KR: 국내 업종 ETF (FDR ETF/KR 목록으로 코드 확인, 2026-09). 데이터는 yfinance(.KS) → FDR 순으로 받는다.
- US: SPDR 섹터 ETF 11종. yf_sector 는 yfinance Sector 키 (구성 상위 기업 조회용).
업종 지수 과거 이력은 무료로 얻기 어려워, 다기간 수익률·상대강도는 이 ETF 들로 계산한다.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class SectorEtf:
    key: str
    name: str
    ticker: str  # KR 은 6자리 코드, US 는 티커
    yf_sector: str | None = None


KR_SECTOR_ETFS: tuple[SectorEtf, ...] = (
    SectorEtf("semiconductor", "반도체", "091160"),
    SectorEtf("it", "IT", "139260"),
    SectorEtf("battery", "2차전지", "305720"),
    SectorEtf("shipbuilding", "조선", "466920"),
    SectorEtf("defense", "방산", "449450"),
    SectorEtf("auto", "자동차", "091180"),
    SectorEtf("bank", "은행", "091170"),
    SectorEtf("securities", "증권", "102970"),
    SectorEtf("insurance", "보험", "140700"),
    SectorEtf("bio", "바이오", "244580"),
    SectorEtf("healthcare", "헬스케어", "266420"),
    SectorEtf("internet", "인터넷", "365000"),
    SectorEtf("game", "게임", "300950"),
    SectorEtf("content", "K콘텐츠", "266360"),
    SectorEtf("construction", "건설", "117700"),
    SectorEtf("steel", "철강", "117680"),
    SectorEtf("chemical", "에너지화학", "117460"),
    SectorEtf("transport", "운송", "140710"),
    SectorEtf("staples", "필수소비재", "266410"),
)

US_SECTOR_ETFS: tuple[SectorEtf, ...] = (
    SectorEtf("technology", "기술", "XLK", "technology"),
    SectorEtf("communication", "커뮤니케이션", "XLC", "communication-services"),
    SectorEtf("discretionary", "경기소비재", "XLY", "consumer-cyclical"),
    SectorEtf("financials", "금융", "XLF", "financial-services"),
    SectorEtf("healthcare", "헬스케어", "XLV", "healthcare"),
    SectorEtf("industrials", "산업재", "XLI", "industrials"),
    SectorEtf("energy", "에너지", "XLE", "energy"),
    SectorEtf("materials", "소재", "XLB", "basic-materials"),
    SectorEtf("staples", "필수소비재", "XLP", "consumer-defensive"),
    SectorEtf("utilities", "유틸리티", "XLU", "utilities"),
    SectorEtf("real_estate", "부동산", "XLRE", "real-estate"),
)

# 벤치마크 (yfinance 티커)
KR_BENCHMARK = "^KS11"
US_BENCHMARK = "^GSPC"
