package io.tbill.backendapi.domain.watchlist.dto;

import io.tbill.backendapi.domain.market.entity.InstrumentMarket;
import io.tbill.backendapi.domain.watchlist.entity.WatchlistItem;

import java.time.LocalDateTime;
import java.util.List;

public class WatchlistDto {

    public record AddCommand(String userEmail, InstrumentMarket market, String code) {}

    public record ReorderCommand(String userEmail, List<Long> ids) {}

    public record ItemInfo(Long id, InstrumentMarket market, String code, String name, int sortOrder,
                           LocalDateTime createdAt) {
        public static ItemInfo from(WatchlistItem item) {
            return new ItemInfo(item.getId(), item.getMarket(), item.getCode(), item.getName(), item.getSortOrder(),
                    item.getCreatedAt());
        }
    }
}
