package io.tbill.backendapi.domain.market.service;

import io.tbill.backendapi.domain.market.entity.InstrumentMarket;
import io.tbill.backendapi.global.exception.MarketException;
import io.tbill.backendapi.infrastructure.client.python.PythonMarketClient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MarketServiceImplTest {

    @Mock
    private PythonMarketClient pythonMarketClient;

    @InjectMocks
    private MarketServiceImpl marketService;

    @Test
    @DisplayName("빈 검색어는 Python 을 호출하지 않고 빈 목록")
    void blankSearch() {
        assertThat(marketService.searchSymbols("  ", null, 10)).isEmpty();
        verifyNoInteractions(pythonMarketClient);
    }

    @Test
    @DisplayName("검색 limit 은 1~50 으로 보정")
    void searchLimitClamped() {
        when(pythonMarketClient.searchSymbols("aapl", null, 50)).thenReturn(List.of());
        marketService.searchSymbols(" aapl ", null, 999);
        verify(pythonMarketClient).searchSymbols("aapl", null, 50);
    }

    @Test
    @DisplayName("캔들 limit 범위를 벗어나면 400")
    void candleLimit() {
        assertThatThrownBy(() -> marketService.getCandles(InstrumentMarket.KR_STOCK, "005930", "1d", null, null, 0))
                .isInstanceOf(MarketException.class);
        assertThatThrownBy(() -> marketService.getCandles(InstrumentMarket.KR_STOCK, "005930", "1d", null, null, 2001))
                .isInstanceOf(MarketException.class);
        verifyNoInteractions(pythonMarketClient);
    }

    @Test
    @DisplayName("시세 키는 공백 제거·중복 제거 후 전달, 50개 초과는 400")
    void quoteKeys() {
        when(pythonMarketClient.getQuotes(any())).thenReturn(List.of());
        marketService.getQuotes(List.of(" CRYPTO:KRW-BTC", "CRYPTO:KRW-BTC", "", "US_STOCK:AAPL"));
        verify(pythonMarketClient).getQuotes(List.of("CRYPTO:KRW-BTC", "US_STOCK:AAPL"));

        List<String> tooMany = IntStream.range(0, 51).mapToObj(i -> "US_STOCK:S" + i).toList();
        assertThatThrownBy(() -> marketService.getQuotes(tooMany)).isInstanceOf(MarketException.class);
        assertThat(marketService.getQuotes(Collections.singletonList(" "))).isEmpty();
    }

    @Test
    @DisplayName("암호화폐 재무 조회는 400")
    void cryptoFundamentals() {
        assertThatThrownBy(() -> marketService.getFundamentals(InstrumentMarket.CRYPTO, "KRW-BTC"))
                .isInstanceOf(MarketException.class);
        verifyNoInteractions(pythonMarketClient);
    }
}
