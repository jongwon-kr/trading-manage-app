package io.tbill.backendapi.presentation.market.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.tbill.backendapi.domain.market.service.MarketStreamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Arrays;

@Tag(name = "Market", description = "시세·차트 조회 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/market")
public class MarketStreamController {

    private final MarketStreamService marketStreamService;

    /**
     * 공개 시세만 전달하므로 인증 없이 허용한다 (EventSource 는 Authorization 헤더를 보낼 수 없음).
     */
    @Operation(summary = "코인 실시간 시세 (SSE)", description = "keys=CRYPTO:KRW-BTC,CRYPTO:KRW-ETH (최대 30개). 이벤트: snapshot, tick")
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@RequestParam String keys) {
        return marketStreamService.subscribe(Arrays.asList(keys.split(",")));
    }
}
