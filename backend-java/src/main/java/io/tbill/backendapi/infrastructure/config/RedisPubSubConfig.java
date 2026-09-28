package io.tbill.backendapi.infrastructure.config;

import io.tbill.backendapi.infrastructure.redis.listener.MarketTickListener;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 실시간 시세 Redis pub/sub 구독 + SSE heartbeat 스케줄링.
 * 테스트처럼 Redis 가 없는 환경에서는 market.stream.enabled=false 로 끈다.
 */
@Configuration
@EnableScheduling
@ConditionalOnProperty(name = "market.stream.enabled", havingValue = "true", matchIfMissing = true)
public class RedisPubSubConfig {

    @Bean
    public RedisMessageListenerContainer marketTickListenerContainer(RedisConnectionFactory connectionFactory,
                                                                     MarketTickListener marketTickListener) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(marketTickListener, new PatternTopic(MarketTickListener.CHANNEL_PATTERN));
        return container;
    }
}
