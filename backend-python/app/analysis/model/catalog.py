"""분석 모델 카탈로그 — 팩터별 설명·공식·파라미터·밴드의 기본값.

- 기본값은 모델 v1 과 정확히 같다. 사용자 전략(config)은 이 값을 덮어쓴다.
- 밴드: 입력값 x 를 점 (xs, ys) 사이에서 선형 보간해 점수(-1~1)로 바꾼다. 양 끝 밖은 끝값 고정.
  기존 clip_lin(x, s) 는 밴드 xs=[-s, s], ys=[-1, 1] 과 같다.
- 라벨·밴드 설명의 {period} 같은 자리표시자는 파라미터 값으로 채운다.
- 계산식은 scoring/{technical,fundamental,regime}.py 에 있다. 여기 rules 는 편집할 수 없는 고정 규칙 설명이다.
"""
from dataclasses import dataclass

GROUP_LABELS = {"technical": "기술적 분석", "fundamental": "기본적 분석", "regime": "시장 국면"}
GROUP_DESCRIPTIONS = {
    "technical": "가격·거래량 시계열로 계산한 추세·모멘텀·변동성·거래량 지표",
    "fundamental": "PER·PBR·ROE 등 최신 재무 지표 (주식만, 과거 시점 재무가 없어 백테스트에서는 제외)",
    "regime": "종목이 속한 시장 전체의 추세·변동성·심리 (위험회피 국면이면 매수 신호를 보류)",
}
SUBGROUP_LABELS = {"trend": "추세", "momentum": "모멘텀", "volatility": "변동성", "volume": "거래량"}
DEFAULT_SUBGROUP_WEIGHTS = {"trend": 0.40, "momentum": 0.30, "volatility": 0.15, "volume": 0.15}
DEFAULT_GROUP_WEIGHTS = {
    "KR_STOCK": {"technical": 0.50, "fundamental": 0.25, "regime": 0.25},
    "US_STOCK": {"technical": 0.50, "fundamental": 0.25, "regime": 0.25},
    "CRYPTO": {"technical": 0.65, "fundamental": 0.0, "regime": 0.35},  # 코인은 재무 데이터 없음
}


@dataclass(frozen=True)
class ParamSpec:
    key: str
    label: str
    default: float
    min: float
    max: float
    integer: bool = True


@dataclass(frozen=True)
class BandSpec:
    name: str
    label: str  # x 축 설명
    unit: str  # pct(비율→%) | ratio | number
    xs: tuple[float, ...]
    ys: tuple[float, ...]


@dataclass(frozen=True)
class InputSpec:
    key: str
    label: str
    unit: str  # price | pct | ratio | number | text


@dataclass(frozen=True)
class FactorSpec:
    key: str
    group: str
    label: str
    weight: float  # 그룹(기술적은 하위 그룹) 안의 기본 가중치
    description: str
    formula: str
    sub_group: str | None = None
    params: tuple[ParamSpec, ...] = ()
    bands: tuple[BandSpec, ...] = ()
    inputs: tuple[InputSpec, ...] = ()
    rules: tuple[str, ...] = ()
    # 파라미터 대소 제약: (작아야 하는 키, 커야 하는 키)
    ordered: tuple[tuple[str, str], ...] = ()


def _lin(scale: float) -> tuple[tuple[float, ...], tuple[float, ...]]:
    return (-scale, scale), (-1.0, 1.0)


def _band(name: str, label: str, unit: str, xy: tuple) -> BandSpec:
    return BandSpec(name, label, unit, tuple(float(x) for x in xy[0]), tuple(float(y) for y in xy[1]))


P, B, I = ParamSpec, _band, InputSpec

FACTORS: tuple[FactorSpec, ...] = (
    # ------------------------------------------------------------------ 기술적 · 추세
    FactorSpec(
        "ma_alignment", "technical", "이동평균 배열", 0.35, sub_group="trend",
        description="종가와 단기·중기·장기 이동평균의 위치 관계. 종가 > 단기 > 중기 > 장기(정배열)일수록 상승 추세가 견고하다고 본다.",
        formula="평균( 밴드①(종가/단기MA − 1), 밴드②(단기MA/중기MA − 1), 밴드③(중기MA/장기MA − 1) )",
        params=(P("fast", "단기 이동평균(일)", 20, 3, 100), P("mid", "중기 이동평균(일)", 60, 5, 200),
                P("slow", "장기 이동평균(일)", 120, 10, 300)),
        bands=(B("priceVsFast", "종가 / {fast}일선 − 1", "pct", _lin(0.05)),
               B("fastVsMid", "{fast}일선 / {mid}일선 − 1", "pct", _lin(0.05)),
               B("midVsSlow", "{mid}일선 / {slow}일선 − 1", "pct", _lin(0.05))),
        inputs=(I("close", "종가", "price"), I("maFast", "{fast}일 이동평균", "price"),
                I("maMid", "{mid}일 이동평균", "price"), I("maSlow", "{slow}일 이동평균", "price")),
        rules=("장기 이동평균이 아직 계산되지 않으면(상장 초기) 앞의 두 항목만 평균한다.",),
        ordered=(("fast", "mid"), ("mid", "slow")),
    ),
    FactorSpec(
        "ma20_slope", "technical", "{period}일선 기울기", 0.20, sub_group="trend",
        description="단기 이동평균이 최근 며칠 동안 얼마나 올랐는지. 이동평균이 우상향하면 추세가 살아 있다고 본다.",
        formula="밴드( {period}일선 ÷ {lookback}일 전 {period}일선 − 1 )",
        params=(P("period", "이동평균 기간(일)", 20, 3, 200), P("lookback", "비교 기간(일)", 5, 1, 60)),
        bands=(B("slope", "{period}일선의 {lookback}일 변화율", "pct", _lin(0.03)),),
        inputs=(I("slope", "{period}일선 {lookback}일 변화율", "pct"),),
    ),
    FactorSpec(
        "adx_direction", "technical", "ADX 추세 강도", 0.25, sub_group="trend",
        description="ADX 는 방향과 무관한 추세의 세기(0~100). 세기는 밴드로 0~1 점수가 되고, +DI 와 −DI 중 큰 쪽이 방향(부호)을 정한다.",
        formula="sign(+DI − −DI) × 밴드(ADX)",
        params=(P("period", "ADX 기간(일)", 14, 5, 50),),
        bands=(B("adx", "ADX({period})", "number", ((15, 25, 40), (0, 0.6, 1))),),
        inputs=(I("adx", "ADX", "number"), I("plusDi", "+DI", "number"), I("minusDi", "−DI", "number")),
        rules=("+DI > −DI 이면 양(+), 반대면 음(−) 부호를 곱한다.",),
    ),
    FactorSpec(
        "relative_strength", "technical", "벤치마크 대비 상대강도({lookback}일)", 0.20, sub_group="trend",
        description="같은 기간 동안 종목 수익률이 시장 지수(벤치마크)보다 얼마나 앞섰는지. 시장보다 강한 종목에 가점.",
        formula="밴드( 종목 {lookback}일 수익률 − 벤치마크 {lookback}일 수익률 )",
        params=(P("lookback", "비교 기간(일)", 60, 5, 250),),
        bands=(B("excess", "{lookback}일 초과수익률", "pct", _lin(0.15)),),
        inputs=(I("excessReturn", "{lookback}일 초과수익률", "pct"),),
        rules=("벤치마크: 코스피·코스닥 종목은 해당 지수, 미국은 S&P 500(나스닥 상장은 나스닥 종합), 코인은 비트코인.",
               "벤치마크가 없거나 분석 대상이 벤치마크 자신(비트코인)이면 제외한다."),
    ),
    # ------------------------------------------------------------------ 기술적 · 모멘텀
    FactorSpec(
        "rsi", "technical", "RSI({period})", 0.35, sub_group="momentum",
        description="최근 상승폭과 하락폭의 비율(0~100). 50~70 의 건전한 상승 모멘텀은 가점, 80 이상 과열은 감점, 20대 과매도는 반등 기대로 소폭 가점.",
        formula="밴드( RSI ) — Wilder 평활",
        params=(P("period", "RSI 기간(일)", 14, 2, 50),),
        bands=(B("rsi", "RSI({period})", "number", ((20, 30, 50, 65, 75, 85), (0.2, -0.2, 0, 0.8, 0.3, -0.6))),),
        inputs=(I("rsi", "RSI", "number"),),
    ),
    FactorSpec(
        "macd_hist", "technical", "MACD 히스토그램", 0.35, sub_group="momentum",
        description="단기·장기 지수이동평균 차이(MACD)가 신호선보다 위(가속)인지 아래(감속)인지. 종목마다 가격대가 달라 ATR 로 나눠 비교한다.",
        formula="밴드( 히스토그램 ÷ ATR(14) ),  히스토그램 = MACD − 신호선,  MACD = EMA(단기) − EMA(장기)",
        params=(P("fast", "단기 EMA(일)", 12, 2, 50), P("slow", "장기 EMA(일)", 26, 5, 100),
                P("signal", "신호선 EMA(일)", 9, 2, 50)),
        bands=(B("histToAtr", "히스토그램 / ATR", "ratio", _lin(0.25)),),
        inputs=(I("macd", "MACD", "number"), I("signal", "신호선", "number"), I("hist", "히스토그램", "number"),
                I("histToAtr", "히스토그램 / ATR", "ratio")),
        ordered=(("fast", "slow"),),
    ),
    FactorSpec(
        "roc20", "technical", "{period}일 변화율(변동성 정규화)", 0.30, sub_group="momentum",
        description="기간 수익률을 그 기간의 변동성으로 나눈 값. 변동성이 큰 종목의 큰 등락을 과대평가하지 않도록 정규화한다.",
        formula="밴드( {period}일 수익률 ÷ ({period}일 일간수익률 표준편차 × √{period}) )",
        params=(P("period", "기간(일)", 20, 5, 120),),
        bands=(B("zScore", "변동성 대비 수익률(배)", "number", _lin(2)),),
        inputs=(I("roc", "{period}일 수익률", "pct"), I("vol", "{period}일 변동성", "pct"),
                I("zScore", "변동성 대비 수익률", "number")),
    ),
    # ------------------------------------------------------------------ 기술적 · 변동성
    FactorSpec(
        "bb_pctb", "technical", "볼린저 %B", 0.50, sub_group="volatility",
        description="볼린저 밴드 안에서 종가의 위치(하단 0, 상단 1). 상단 근처의 강세는 가점, 밴드를 크게 벗어난 과열은 감점.",
        formula="밴드( (종가 − 하단) ÷ (상단 − 하단) ),  상·하단 = {period}일 평균 ± {k}σ",
        params=(P("period", "기간(일)", 20, 5, 100), P("k", "표준편차 배수", 2.0, 0.5, 4.0, integer=False)),
        bands=(B("pctB", "%B", "ratio", ((-0.2, 0, 0.5, 0.9, 1.1, 1.3), (-0.6, -0.3, 0, 0.4, 0, -0.5))),),
        inputs=(I("pctB", "%B", "ratio"), I("upper", "상단", "price"), I("lower", "하단", "price")),
    ),
    FactorSpec(
        "atr_regime", "technical", "변동성(ATR) 수준", 0.50, sub_group="volatility",
        description="현재 변동성(ATR/가격)이 과거 평소 수준보다 높은지. 변동성이 평소보다 커지면 위험이 커진 것으로 보고 감점.",
        formula="밴드( (ATR÷종가) ÷ 최근 {lookback}일 (ATR÷종가) 중앙값 )",
        params=(P("period", "ATR 기간(일)", 14, 5, 50), P("lookback", "비교 기간(일)", 252, 60, 500)),
        bands=(B("vsMedian", "평소 대비 변동성(배)", "ratio", ((0.7, 1, 1.5, 2.5), (0.3, 0.1, -0.3, -0.8))),),
        inputs=(I("atr", "ATR", "price"), I("atrPct", "ATR / 종가", "pct"), I("vsMedian", "평소 대비 변동성", "ratio")),
        rules=("중앙값은 최소 60개 봉이 쌓인 뒤부터 계산한다.",),
    ),
    # ------------------------------------------------------------------ 기술적 · 거래량
    FactorSpec(
        "obv_flow", "technical", "OBV 자금 흐름", 0.50, sub_group="volume",
        description="오른 날 거래량은 더하고 내린 날 거래량은 빼는 OBV 가 최근 얼마나 늘었는지. 상승일에 거래가 몰리면 매수세 유입으로 본다.",
        formula="밴드( OBV {lookback}일 변화량 ÷ {lookback}일 거래량 합계 )",
        params=(P("lookback", "기간(일)", 20, 5, 120),),
        bands=(B("flowRatio", "OBV 변화 / 거래량 합계", "ratio", _lin(0.5)),),
        inputs=(I("obvChange", "OBV {lookback}일 변화", "number"), I("volumeSum", "{lookback}일 거래량 합계", "number"),
                I("flowRatio", "OBV 변화 / 거래량 합계", "ratio")),
    ),
    FactorSpec(
        "volume_surge", "technical", "거래량 급증×방향", 0.50, sub_group="volume",
        description="최근 거래량이 평소보다 얼마나 늘었는지(세기)와 그동안 가격이 오르고 내렸는지(방향)의 곱. 상승하며 거래가 터지면 가점.",
        formula="sign({short}일 가격 변화) × 밴드( {short}일 평균 거래량 ÷ {long}일 평균 거래량 )",
        params=(P("short", "단기 거래량(일)", 5, 2, 30), P("long", "장기 거래량(일)", 20, 5, 120)),
        bands=(B("volumeRatio", "{short}일 / {long}일 평균 거래량", "ratio", ((0.8, 1, 1.5, 2.5), (0, 0.2, 0.6, 1))),),
        inputs=(I("volumeRatio", "{short}일 / {long}일 거래량", "ratio"), I("priceChange", "{short}일 가격 변화", "pct")),
        rules=("최근 {short}일 가격이 올랐으면 양(+), 내렸으면 음(−) 부호를 곱한다.",),
        ordered=(("short", "long"),),
    ),
    # ------------------------------------------------------------------ 기본적
    FactorSpec(
        "valuation", "fundamental", "밸류에이션(PER·PBR)", 0.30,
        description="이익·자산 대비 주가 수준. PER·PBR 이 낮을수록(저평가) 가점.",
        formula="평균( 밴드(PER), 밴드(PBR) )",
        params=(P("negativePerScore", "적자(PER ≤ 0) 점수", -0.8, -1.0, 1.0, integer=False),),
        bands=(B("per", "PER (배)", "number", ((8, 15, 25, 40, 60), (1, 0.5, 0, -0.5, -1))),
               B("pbr", "PBR (배)", "number", ((1, 3, 6, 10), (0.6, 0.2, -0.3, -0.8)))),
        inputs=(I("per", "PER", "number"), I("pbr", "PBR", "number")),
        rules=("PER ≤ 0(적자)이면 PER 항목은 '적자 점수'를 쓴다.", "PBR 이 없거나 0 이하면 PBR 항목을 뺀다."),
    ),
    FactorSpec(
        "profitability", "fundamental", "수익성(ROE·영업이익률)", 0.25,
        description="자본 대비 이익(ROE)과 매출 대비 영업이익률. 높을수록 가점.",
        formula="평균( 밴드(ROE), 밴드(영업이익률) )",
        bands=(B("roe", "ROE", "pct", ((-0.05, 0, 0.08, 0.15, 0.25), (-1, -0.5, 0, 0.6, 1))),
               B("operatingMargin", "영업이익률", "pct", ((0, 0.05, 0.15, 0.30), (-0.6, 0, 0.5, 1)))),
        inputs=(I("roe", "ROE", "pct"), I("operatingMargin", "영업이익률", "pct")),
    ),
    FactorSpec(
        "growth", "fundamental", "성장성(EPS·매출)", 0.25,
        description="주당순이익(EPS)과 매출의 전년 대비 증가율. 높을수록 가점.",
        formula="평균( 밴드(EPS 증가율), 밴드(매출 증가율) )",
        bands=(B("epsGrowth", "EPS 증가율", "pct", ((-0.3, 0, 0.1, 0.3), (-1, -0.2, 0.4, 1))),
               B("revenueGrowth", "매출 증가율", "pct", ((-0.3, 0, 0.1, 0.3), (-1, -0.2, 0.4, 1)))),
        inputs=(I("epsGrowth", "EPS 증가율", "pct"), I("revenueGrowth", "매출 증가율", "pct")),
    ),
    FactorSpec(
        "health", "fundamental", "재무건전성(부채비율)", 0.10,
        description="자본 대비 부채. 낮을수록 가점.",
        formula="밴드( 부채 ÷ 자본 )",
        bands=(B("debtToEquity", "부채비율 (배)", "ratio", ((0.3, 1, 2, 3), (0.6, 0.2, -0.4, -1))),),
        inputs=(I("debtToEquity", "부채비율", "ratio"),),
    ),
    FactorSpec(
        "dividend", "fundamental", "배당", 0.10,
        description="배당수익률. 적당히 높으면 가점, 지나치게 높으면(주가 급락·일회성 배당 가능성) 가점을 줄인다.",
        formula="밴드( 배당수익률 )",
        bands=(B("dividendYield", "배당수익률", "pct", ((0, 0.01, 0.03, 0.06, 0.10), (-0.1, 0, 0.5, 0.8, 0.2))),),
        inputs=(I("dividendYield", "배당수익률", "pct"),),
    ),
    # ------------------------------------------------------------------ 시장 국면
    FactorSpec(
        "index_trend", "regime", "지수 추세", 0.50,
        description="시장 지수가 이동평균 위에 있고 단기 이동평균이 장기 위에 있으면 상승 국면으로 본다.",
        formula="평균( 밴드①(지수/{fast}일선 − 1), 밴드②({fast}일선/{slow}일선 − 1) )",
        params=(P("fast", "단기 이동평균(일)", 50, 10, 150), P("slow", "장기 이동평균(일)", 200, 50, 400)),
        bands=(B("priceVsFast", "지수 / {fast}일선 − 1", "pct", _lin(0.05)),
               B("fastVsSlow", "{fast}일선 / {slow}일선 − 1", "pct", _lin(0.05))),
        inputs=(I("index", "지수", "text"), I("close", "지수 종가", "number"), I("maFast", "{fast}일 이동평균", "number"),
                I("maSlow", "{slow}일 이동평균", "number")),
        rules=("지수: 한국은 종목이 속한 코스피/코스닥, 미국은 S&P 500, 코인은 비트코인.",
               "장기 이동평균이 없으면 첫 항목만 쓴다."),
        ordered=(("fast", "slow"),),
    ),
    FactorSpec(
        "volatility_regime", "regime", "변동성 국면", 0.30,
        description="시장 변동성이 높을수록 위험회피 국면으로 보고 감점. 미국은 VIX, 한국은 지수 실현변동성과 VIX, 코인은 비트코인 실현변동성.",
        formula="미국: 밴드(VIX) · 한국: 평균(밴드(실현변동성 백분위), 밴드(VIX)) · 코인: 밴드(실현변동성 백분위)",
        params=(P("rvPeriod", "실현변동성 기간(일)", 20, 5, 60), P("rankWindow", "백분위 비교 기간(일)", 252, 60, 500)),
        bands=(B("vix", "VIX", "number", ((12, 16, 20, 28, 40), (0.6, 0.3, 0, -0.6, -1))),
               B("realizedVolRank", "실현변동성 백분위 (최근 {rankWindow}일 중)", "ratio",
                 ((0.2, 0.5, 0.8, 0.95), (0.4, 0, -0.5, -1)))),
        inputs=(I("vix", "VIX", "number"), I("realizedVol", "{rvPeriod}일 실현변동성(연환산)", "pct"),
                I("realizedVolRank", "실현변동성 백분위", "ratio")),
        rules=("실현변동성 = 로그수익률 표준편차 × √연환산 (주식 252일, 코인 365일).",),
    ),
    FactorSpec(
        "breadth_sentiment", "regime", "시장 폭·심리", 0.20,
        description="오늘 오른 종목의 비율(시장 폭)과 코인 공포탐욕지수. 공포탐욕지수는 역발상으로 극단적 탐욕을 감점한다.",
        formula="한국: 밴드(상승 종목 비율) · 코인: 평균(밴드(상승 비율), 밴드(공포탐욕지수)) · 미국: 제외",
        bands=(B("advanceRatio", "상승 종목 비율", "pct", ((0.35, 0.5, 0.65), (-1, 0, 1))),
               B("fearGreed", "공포탐욕지수 (0~100)", "number", ((10, 25, 50, 75, 90), (0.5, 0.3, 0, -0.3, -0.6)))),
        inputs=(I("advanceRatio", "상승 종목 비율", "pct"), I("fearGreed", "공포탐욕지수", "number")),
        rules=("당일 스냅샷만 있어 백테스트에서는 제외한다.", "미국은 무료 시장 폭 데이터가 없어 제외한다."),
    ),
)

FACTOR_BY_KEY: dict[str, FactorSpec] = {f.key: f for f in FACTORS}


def factors_of(group: str) -> list[FactorSpec]:
    return [f for f in FACTORS if f.group == group]


def fill(template: str, params: dict) -> str:
    """'{period}일선' 같은 자리표시자를 파라미터 값으로 채운다 (정수는 정수로)."""
    values = {k: (int(v) if float(v).is_integer() else v) for k, v in params.items()}
    try:
        return template.format(**values)
    except (KeyError, IndexError, ValueError):
        return template


def catalog_dict() -> dict:
    """프론트 방법론 페이지·전략 편집기용 카탈로그 (camelCase)"""
    return {
        "groups": [{"key": g, "label": GROUP_LABELS[g], "description": GROUP_DESCRIPTIONS[g]} for g in GROUP_LABELS],
        "subGroups": [{"key": k, "label": v} for k, v in SUBGROUP_LABELS.items()],
        "factors": [{
            "key": f.key, "group": f.group, "subGroup": f.sub_group, "label": f.label, "description": f.description,
            "formula": f.formula, "rules": list(f.rules),
            "params": [{"key": p.key, "label": p.label, "default": p.default, "min": p.min, "max": p.max,
                        "integer": p.integer} for p in f.params],
            "bands": [{"name": b.name, "label": b.label, "unit": b.unit, "xs": list(b.xs), "ys": list(b.ys)}
                      for b in f.bands],
            "inputs": [{"key": i.key, "label": i.label, "unit": i.unit} for i in f.inputs],
            "ordered": [list(o) for o in f.ordered],
        } for f in FACTORS],
    }
