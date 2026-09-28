package io.tbill.backendapi.presentation.watchlist.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.tbill.backendapi.domain.watchlist.service.WatchlistService;
import io.tbill.backendapi.global.utils.auth.AuthUtils;
import io.tbill.backendapi.presentation.watchlist.dto.WatchlistApiDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Watchlist", description = "관심종목 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/watchlist")
public class WatchlistController {

    private final WatchlistService watchlistService;

    @Operation(summary = "관심종목 목록")
    @GetMapping
    public ResponseEntity<List<WatchlistApiDto.ItemResponse>> getItems() {
        String email = AuthUtils.getCurrentUserEmail();
        return ResponseEntity.ok(watchlistService.getItems(email).stream().map(WatchlistApiDto.ItemResponse::new).toList());
    }

    @Operation(summary = "관심종목 추가", description = "중복 시 409, 최대 50개")
    @PostMapping("/items")
    public ResponseEntity<WatchlistApiDto.ItemResponse> addItem(@Valid @RequestBody WatchlistApiDto.AddRequest request) {
        String email = AuthUtils.getCurrentUserEmail();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new WatchlistApiDto.ItemResponse(watchlistService.addItem(request.toCommand(email))));
    }

    @Operation(summary = "관심종목 삭제")
    @DeleteMapping("/items/{id}")
    public ResponseEntity<Void> removeItem(@PathVariable Long id) {
        watchlistService.removeItem(id, AuthUtils.getCurrentUserEmail());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "관심종목 순서 변경", description = "ids: 본인 관심종목 id 전체를 원하는 순서로")
    @PutMapping("/items/order")
    public ResponseEntity<Void> reorder(@Valid @RequestBody WatchlistApiDto.ReorderRequest request) {
        watchlistService.reorder(request.toCommand(AuthUtils.getCurrentUserEmail()));
        return ResponseEntity.noContent().build();
    }
}
