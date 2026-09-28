package io.tbill.backendapi.presentation.watchlist.dto;

import io.tbill.backendapi.domain.market.entity.InstrumentMarket;
import io.tbill.backendapi.domain.watchlist.dto.WatchlistDto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;

public class WatchlistApiDto {

    public record AddRequest(
            @NotNull(message = "market 은 필수입니다.") InstrumentMarket market,
            @NotBlank(message = "code 는 필수입니다.") @Size(max = 32) String code
    ) {
        public WatchlistDto.AddCommand toCommand(String userEmail) {
            return new WatchlistDto.AddCommand(userEmail, market, code.trim());
        }
    }

    public record ReorderRequest(@NotEmpty(message = "ids 는 비어 있을 수 없습니다.") List<Long> ids) {
        public WatchlistDto.ReorderCommand toCommand(String userEmail) {
            return new WatchlistDto.ReorderCommand(userEmail, ids);
        }
    }

    public record ItemResponse(Long id, InstrumentMarket market, String code, String name, int sortOrder,
                               LocalDateTime createdAt) {
        public ItemResponse(WatchlistDto.ItemInfo info) {
            this(info.id(), info.market(), info.code(), info.name(), info.sortOrder(), info.createdAt());
        }
    }
}
