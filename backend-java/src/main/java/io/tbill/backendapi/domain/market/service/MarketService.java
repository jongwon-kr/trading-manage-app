package io.tbill.backendapi.domain.market.service;

import com.fasterxml.jackson.databind.JsonNode;
import io.tbill.backendapi.domain.market.dto.MarketDto;
import io.tbill.backendapi.domain.market.entity.InstrumentMarket;

import java.util.List;

public interface MarketService {

    List<MarketDto.SymbolInfo> searchSymbols(String q, InstrumentMarket market, int limit);

    MarketDto.SymbolInfo getSymbol(InstrumentMarket market, String code);

    MarketDto.CandleSeriesInfo getCandles(InstrumentMarket market, String symbol, String interval,
                                          String from, String to, int limit);

    MarketDto.QuoteInfo getQuote(InstrumentMarket market, String symbol);

    List<MarketDto.QuoteInfo> getQuotes(List<String> keys);

    MarketDto.FundamentalsInfo getFundamentals(InstrumentMarket market, String symbol);

    JsonNode getOverview();

    MarketDto.MoversInfo getMovers(InstrumentMarket market, int limit);

    JsonNode getTrends(InstrumentMarket market);

    JsonNode getTrendGroup(InstrumentMarket market, String kind, String groupId);

    JsonNode getBriefing(InstrumentMarket market, java.time.LocalDate date);

    JsonNode getBriefingDates(InstrumentMarket market);
}
