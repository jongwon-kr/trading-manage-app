package io.tbill.backendapi.domain.watchlist.service;

import io.tbill.backendapi.domain.watchlist.dto.WatchlistDto;

import java.util.List;

public interface WatchlistService {

    List<WatchlistDto.ItemInfo> getItems(String userEmail);

    WatchlistDto.ItemInfo addItem(WatchlistDto.AddCommand command);

    void removeItem(Long id, String userEmail);

    void reorder(WatchlistDto.ReorderCommand command);
}
