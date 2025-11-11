package io.tbill.backendapi;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(
        properties = {
                "spring.kafka.enabled=false",
                "spring.data.redis.repositories.enabled=false"
        }
)
@ActiveProfiles("test")
@DisplayName("Spring Boot 통합 테스트")
class BackendJavaApplicationTests {

    @Test
    @DisplayName("Spring Context 로딩 테스트")
    void contextLoads() {
        // Spring Boot 애플리케이션 컨텍스트가 정상적으로 로드되는지 확인
    }
}
