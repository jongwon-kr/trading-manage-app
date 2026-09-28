package io.tbill.backendapi.domain.market.dto;

import io.tbill.backendapi.domain.market.entity.InstrumentMarket;

import java.util.List;

/**
 * 시세 조회 응답 모델. Python 내부 API(camelCase JSON)를 그대로 역직렬화해 프론트로 전달한다.
 * 시세는 순수 pass-through 이므로 ApiDto 로 한 번 더 변환하지 않고 이 record 를 응답 본문으로 사용한다.
 */
public class MarketDto {

    public record SymbolInfo(
            InstrumentMarket market,
            String exchange,
            String code,
            String name,
            String nameEn,
            String currency,
            String sector,
            Integer pricePrecision, // KR 0, US 2, CRYPTO null(가격대별로 클라이언트가 결정)
            String warning
    ) {}

    /** time: 봉 시작 시각 epoch 초(UTC). 일봉 이상은 거래일 00:00 UTC */
    public record CandleInfo(long time, double open, double high, double low, double close, double volume) {}

    public record CandleSeriesInfo(
            SymbolInfo symbol,
            String interval,
            List<CandleInfo> candles,
            String source,
            boolean delayed
    ) {}

    public record QuoteInfo(
            String key,
            InstrumentMarket market,
            String code,
            String name,
            double price,
            Double open,
            Double high,
            Double low,
            Double prevClose,
            String change,       // RISE | EVEN | FALL
            double changePrice,  // 부호 포함
            double changeRate,   // 소수 (-0.015 = -1.5%)
            Double volume,
            Double accTradeVolume,
            Double tradeValue,
            String currency,
            long ts,             // epoch ms
            boolean delayed,
            String source
    ) {}

    public record FundamentalsInfo(
            InstrumentMarket market,
            String code,
            Double per,
            Double pbr,
            Double eps,
            Double bps,
            Double roe,
            Double operatingMargin,
            Double debtToEquity,
            Double dividendYield,
            Double epsGrowth,
            Double revenueGrowth,
            Double marketCap,
            String sector,
            String asOf,
            String source
    ) {}

    public record MoversInfo(List<QuoteInfo> gainers, List<QuoteInfo> losers, List<QuoteInfo> mostActive) {}
}
