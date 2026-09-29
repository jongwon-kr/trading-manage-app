package io.tbill.backendapi.domain.market.service;

import com.fasterxml.jackson.databind.JsonNode;
import io.tbill.backendapi.domain.market.dto.MarketDto;
import io.tbill.backendapi.domain.market.entity.InstrumentMarket;
import io.tbill.backendapi.global.exception.MarketException;
import io.tbill.backendapi.infrastructure.client.python.PythonMarketClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 시세 조회. 캐시·공급자 폴백은 Python 쪽이 담당하므로 여기서는 입력 검증 후 위임만 한다.
 */
@Service
@RequiredArgsConstructor
public class MarketServiceImpl implements MarketService {

    static final int MAX_CANDLE_LIMIT = 2000;
    static final int MAX_QUOTE_KEYS = 50;

    private final PythonMarketClient pythonMarketClient;

    @Override
    public List<MarketDto.SymbolInfo> searchSymbols(String q, InstrumentMarket market, int limit) {
        if (q == null || q.isBlank()) {
            return List.of();
        }
        return pythonMarketClient.searchSymbols(q.trim(), market, Math.min(Math.max(limit, 1), 50));
    }

    @Override
    public MarketDto.SymbolInfo getSymbol(InstrumentMarket market, String code) {
        return pythonMarketClient.getSymbol(market, code);
    }

    @Override
    public MarketDto.CandleSeriesInfo getCandles(InstrumentMarket market, String symbol, String interval,
                                                 String from, String to, int limit) {
        if (limit < 1 || limit > MAX_CANDLE_LIMIT) {
            throw MarketException.badRequest("limit 은 1~" + MAX_CANDLE_LIMIT + " 사이여야 합니다.");
        }
        return pythonMarketClient.getCandles(market, symbol, interval, from, to, limit);
    }

    @Override
    public MarketDto.QuoteInfo getQuote(InstrumentMarket market, String symbol) {
        return pythonMarketClient.getQuote(market, symbol);
    }

    @Override
    public List<MarketDto.QuoteInfo> getQuotes(List<String> keys) {
        List<String> cleaned = keys.stream().map(String::trim).filter(k -> !k.isEmpty()).distinct().toList();
        if (cleaned.isEmpty()) {
            return List.of();
        }
        if (cleaned.size() > MAX_QUOTE_KEYS) {
            throw MarketException.badRequest("한 번에 최대 " + MAX_QUOTE_KEYS + "개 종목까지 조회할 수 있습니다.");
        }
        return pythonMarketClient.getQuotes(cleaned);
    }

    @Override
    public MarketDto.FundamentalsInfo getFundamentals(InstrumentMarket market, String symbol) {
        if (market == InstrumentMarket.CRYPTO) {
            throw MarketException.badRequest("암호화폐는 재무 지표를 제공하지 않습니다.");
        }
        return pythonMarketClient.getFundamentals(market, symbol);
    }

    @Override
    public JsonNode getOverview() {
        return pythonMarketClient.getOverview();
    }

    @Override
    public MarketDto.MoversInfo getMovers(InstrumentMarket market, int limit) {
        return pythonMarketClient.getMovers(market, Math.min(Math.max(limit, 1), 30));
    }

    @Override
    public JsonNode getTrends(InstrumentMarket market) {
        return pythonMarketClient.getTrends(market);
    }

    @Override
    public JsonNode getTrendGroup(InstrumentMarket market, String kind, String groupId) {
        if (!java.util.Set.of("industry", "theme", "sector").contains(kind)) {
            throw MarketException.badRequest("kind 는 industry, theme, sector 중 하나여야 합니다.");
        }
        return pythonMarketClient.getTrendGroup(market, kind, groupId);
    }

    @Override
    public JsonNode getBriefing(InstrumentMarket market, java.time.LocalDate date) {
        return pythonMarketClient.getBriefing(market, date != null ? date.toString() : null);
    }

    @Override
    public JsonNode getBriefingDates(InstrumentMarket market) {
        return pythonMarketClient.getBriefingDates(market);
    }
}
