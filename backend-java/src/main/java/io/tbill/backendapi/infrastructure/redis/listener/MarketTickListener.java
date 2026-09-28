package io.tbill.backendapi.infrastructure.redis.listener;

import io.tbill.backendapi.domain.market.service.MarketStreamService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

/**
 * Redis 채널 market:tick:{market}:{code} (backend-python app.stream 이 발행) → SSE 허브로 전달
 */
@Component
@RequiredArgsConstructor
public class MarketTickListener implements MessageListener {

    public static final String CHANNEL_PATTERN = "market:tick:*";
    private static final String CHANNEL_PREFIX = "market:tick:";

    private final MarketStreamService marketStreamService;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String channel = new String(message.getChannel(), StandardCharsets.UTF_8);
        String key = channel.substring(CHANNEL_PREFIX.length()); // CRYPTO:KRW-BTC
        marketStreamService.publish(key, new String(message.getBody(), StandardCharsets.UTF_8));
    }
}
