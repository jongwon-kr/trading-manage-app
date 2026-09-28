package io.tbill.backendapi.infrastructure.client.python;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.tbill.backendapi.domain.market.dto.MarketDto;
import io.tbill.backendapi.domain.market.entity.InstrumentMarket;
import io.tbill.backendapi.global.exception.MarketException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class PythonMarketClientTest {

    private MockRestServiceServer server;
    private PythonMarketClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder()
                .baseUrl("http://python")
                .defaultHeader(PythonClientConfig.INTERNAL_TOKEN_HEADER, "secret");
        server = MockRestServiceServer.bindTo(builder).build();
        client = new PythonMarketClient(builder.build(), new ObjectMapper());
    }

    @Test
    @DisplayName("캔들 응답을 역직렬화하고 내부 토큰 헤더를 보낸다")
    void getCandles() {
        server.expect(requestTo("http://python/internal/v1/candles?market=KR_STOCK&symbol=005930&interval=1d&limit=2"))
                .andExpect(header(PythonClientConfig.INTERNAL_TOKEN_HEADER, "secret"))
                .andRespond(withSuccess("""
                        {"symbol":{"market":"KR_STOCK","exchange":"KOSPI","code":"005930","name":"삼성전자",
                                   "currency":"KRW","pricePrecision":0},
                         "interval":"1d",
                         "candles":[{"time":1790035200,"open":1,"high":2,"low":0.5,"close":1.5,"volume":10}],
                         "source":"fdr","delayed":false}
                        """, MediaType.APPLICATION_JSON));

        MarketDto.CandleSeriesInfo result = client.getCandles(InstrumentMarket.KR_STOCK, "005930", "1d", null, null, 2);

        assertThat(result.symbol().name()).isEqualTo("삼성전자");
        assertThat(result.candles()).hasSize(1);
        assertThat(result.candles().get(0).time()).isEqualTo(1790035200L);
        assertThat(result.source()).isEqualTo("fdr");
        server.verify();
    }

    @Test
    @DisplayName("검색어의 한글은 URL 인코딩되어 전달된다")
    void searchEncodesQuery() {
        server.expect(requestTo("http://python/internal/v1/symbols/search?q=%EC%82%BC%EC%84%B1&limit=5"))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        List<MarketDto.SymbolInfo> result = client.searchSymbols("삼성", null, 5);

        assertThat(result).isEmpty();
        server.verify();
    }

    @Test
    @DisplayName("Python 404 → MARKET_SYMBOL_NOT_FOUND(404)")
    void notFound() {
        server.expect(requestTo("http://python/internal/v1/symbols/KR_STOCK/999999"))
                .andRespond(withStatus(HttpStatus.NOT_FOUND).contentType(MediaType.APPLICATION_JSON)
                        .body("{\"code\":\"MARKET_SYMBOL_NOT_FOUND\",\"message\":\"없음\"}"));

        assertThatThrownBy(() -> client.getSymbol(InstrumentMarket.KR_STOCK, "999999"))
                .isInstanceOf(MarketException.class)
                .satisfies(e -> {
                    MarketException me = (MarketException) e;
                    assertThat(me.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
                    assertThat(me.getCode()).isEqualTo("MARKET_SYMBOL_NOT_FOUND");
                    assertThat(me.getMessage()).isEqualTo("없음");
                });
    }

    @Test
    @DisplayName("Python 422 → 코드는 유지하고 400 으로 변환")
    void validationError() {
        server.expect(requestTo("http://python/internal/v1/candles?market=KR_STOCK&symbol=005930&interval=1m&limit=10"))
                .andRespond(withStatus(HttpStatus.UNPROCESSABLE_ENTITY).contentType(MediaType.APPLICATION_JSON)
                        .body("{\"code\":\"INTERVAL_NOT_SUPPORTED\",\"message\":\"미지원\"}"));

        assertThatThrownBy(() -> client.getCandles(InstrumentMarket.KR_STOCK, "005930", "1m", null, null, 10))
                .isInstanceOf(MarketException.class)
                .satisfies(e -> {
                    assertThat(((MarketException) e).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(((MarketException) e).getCode()).isEqualTo("INTERVAL_NOT_SUPPORTED");
                });
    }

    @Test
    @DisplayName("Python 5xx 와 내부 토큰 오류(401)는 503")
    void unavailable() {
        server.expect(requestTo("http://python/internal/v1/overview"))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE).contentType(MediaType.APPLICATION_JSON)
                        .body("{\"code\":\"MARKET_DATA_UNAVAILABLE\",\"message\":\"공급자 실패\"}"));
        assertThatThrownBy(() -> client.getOverview())
                .satisfies(e -> assertThat(((MarketException) e).getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));

        server.reset();
        server.expect(requestTo("http://python/internal/v1/overview"))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED));
        assertThatThrownBy(() -> client.getOverview())
                .satisfies(e -> assertThat(((MarketException) e).getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));
    }
}
