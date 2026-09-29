package io.tbill.backendapi.infrastructure.client.python;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;

@Configuration
public class PythonClientConfig {

    public static final String INTERNAL_TOKEN_HEADER = "X-Internal-Token";

    /**
     * backend-python 시세 내부 API 호출용 RestClient.
     * 공급자(yfinance 등) 첫 조회가 수 초 걸릴 수 있어 read timeout 은 넉넉히 20초.
     */
    @Bean
    public RestClient pythonMarketRestClient(
            @Value("${python.market.base-url}") String baseUrl,
            @Value("${python.market.internal-token}") String internalToken
    ) {
        // HTTP/1.1 고정: 기본값(HTTP/2)은 평문 연결에서 h2c 업그레이드를 시도하는데,
        // uvicorn 은 업그레이드 요청의 본문을 버려 POST(전략 설정 검증)가 빈 본문으로 도착한다.
        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(2))
                .build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofSeconds(20));

        return RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .defaultHeader(INTERNAL_TOKEN_HEADER, internalToken)
                .build();
    }
}
