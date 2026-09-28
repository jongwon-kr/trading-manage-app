package io.tbill.backendapi.presentation.market.controller;

import com.fasterxml.jackson.databind.JsonNode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.tbill.backendapi.domain.market.dto.MarketDto;
import io.tbill.backendapi.domain.market.entity.InstrumentMarket;
import io.tbill.backendapi.domain.market.service.MarketService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;

@Tag(name = "Market", description = "시세·차트 조회 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/market")
public class MarketController {

    private final MarketService marketService;

    @Operation(summary = "종목 검색", description = "코드·이름(한/영)으로 검색. market 생략 시 전체 시장")
    @GetMapping("/symbols/search")
    public ResponseEntity<List<MarketDto.SymbolInfo>> searchSymbols(
            @RequestParam String q,
            @RequestParam(required = false) InstrumentMarket market,
            @RequestParam(defaultValue = "20") int limit
    ) {
        return ResponseEntity.ok(marketService.searchSymbols(q, market, limit));
    }

    @Operation(summary = "종목 정보")
    @GetMapping("/symbols/{market}/{code}")
    public ResponseEntity<MarketDto.SymbolInfo> getSymbol(
            @PathVariable InstrumentMarket market,
            @PathVariable String code
    ) {
        return ResponseEntity.ok(marketService.getSymbol(market, code));
    }

    @Operation(summary = "캔들(OHLCV)", description = "interval: 1m 5m 15m 30m 1h 4h 1d 1w 1M. from/to: ISO 날짜 또는 일시")
    @GetMapping("/candles")
    public ResponseEntity<MarketDto.CandleSeriesInfo> getCandles(
            @RequestParam InstrumentMarket market,
            @RequestParam String symbol,
            @RequestParam(defaultValue = "1d") String interval,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(defaultValue = "300") int limit
    ) {
        return ResponseEntity.ok(marketService.getCandles(market, symbol, interval, from, to, limit));
    }

    @Operation(summary = "현재가")
    @GetMapping("/quote")
    public ResponseEntity<MarketDto.QuoteInfo> getQuote(
            @RequestParam InstrumentMarket market,
            @RequestParam String symbol
    ) {
        return ResponseEntity.ok(marketService.getQuote(market, symbol));
    }

    @Operation(summary = "현재가 일괄", description = "keys=KR_STOCK:005930,CRYPTO:KRW-BTC (최대 50개)")
    @GetMapping("/quotes")
    public ResponseEntity<List<MarketDto.QuoteInfo>> getQuotes(@RequestParam String keys) {
        return ResponseEntity.ok(marketService.getQuotes(Arrays.asList(keys.split(","))));
    }

    @Operation(summary = "재무 지표", description = "주식만 지원 (PER, PBR, ROE, 부채비율, 배당 등)")
    @GetMapping("/fundamentals")
    public ResponseEntity<MarketDto.FundamentalsInfo> getFundamentals(
            @RequestParam InstrumentMarket market,
            @RequestParam String symbol
    ) {
        return ResponseEntity.ok(marketService.getFundamentals(market, symbol));
    }

    @Operation(summary = "시장 개요", description = "주요 지수, 장 운영 상태, 공포탐욕지수, BTC 도미넌스")
    @GetMapping("/overview")
    public ResponseEntity<JsonNode> getOverview() {
        return ResponseEntity.ok(marketService.getOverview());
    }

    @Operation(summary = "상승/하락/거래대금 상위")
    @GetMapping("/movers")
    public ResponseEntity<MarketDto.MoversInfo> getMovers(
            @RequestParam InstrumentMarket market,
            @RequestParam(defaultValue = "10") int limit
    ) {
        return ResponseEntity.ok(marketService.getMovers(market, limit));
    }
}
