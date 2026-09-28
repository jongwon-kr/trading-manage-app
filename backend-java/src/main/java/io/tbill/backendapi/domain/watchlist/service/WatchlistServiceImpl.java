package io.tbill.backendapi.domain.watchlist.service;

import io.tbill.backendapi.domain.market.dto.MarketDto;
import io.tbill.backendapi.domain.watchlist.dto.WatchlistDto;
import io.tbill.backendapi.domain.watchlist.entity.WatchlistItem;
import io.tbill.backendapi.domain.watchlist.repository.WatchlistItemRepository;
import io.tbill.backendapi.global.exception.MarketException;
import io.tbill.backendapi.infrastructure.client.python.PythonMarketClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class WatchlistServiceImpl implements WatchlistService {

    static final int MAX_ITEMS = 50;

    private final WatchlistItemRepository watchlistItemRepository;
    private final PythonMarketClient pythonMarketClient;

    @Override
    public List<WatchlistDto.ItemInfo> getItems(String userEmail) {
        return watchlistItemRepository.findByUserEmailOrderBySortOrderAscIdAsc(userEmail).stream()
                .map(WatchlistDto.ItemInfo::from)
                .toList();
    }

    @Override
    @Transactional
    public WatchlistDto.ItemInfo addItem(WatchlistDto.AddCommand command) {
        String email = command.userEmail();
        if (watchlistItemRepository.existsByUserEmailAndMarketAndCode(email, command.market(), command.code())) {
            throw new MarketException("WATCHLIST_DUPLICATE", HttpStatus.CONFLICT, "이미 관심종목에 있습니다.");
        }
        if (watchlistItemRepository.countByUserEmail(email) >= MAX_ITEMS) {
            throw MarketException.badRequest("관심종목은 최대 " + MAX_ITEMS + "개까지 등록할 수 있습니다.");
        }
        // 종목 존재 확인 겸 표시용 이름 조회 (없으면 404)
        MarketDto.SymbolInfo symbol = pythonMarketClient.getSymbol(command.market(), command.code());

        WatchlistItem saved = watchlistItemRepository.save(WatchlistItem.builder()
                .userEmail(email)
                .market(command.market())
                .code(symbol.code())
                .name(symbol.name())
                .sortOrder(watchlistItemRepository.findMaxSortOrder(email) + 1)
                .build());
        log.info("관심종목 추가: user={}, {}:{}", email, saved.getMarket(), saved.getCode());
        return WatchlistDto.ItemInfo.from(saved);
    }

    @Override
    @Transactional
    public void removeItem(Long id, String userEmail) {
        WatchlistItem item = watchlistItemRepository.findByIdAndUserEmail(id, userEmail)
                .orElseThrow(() -> new MarketException("WATCHLIST_NOT_FOUND", HttpStatus.NOT_FOUND,
                        "관심종목을 찾을 수 없습니다."));
        watchlistItemRepository.delete(item);
    }

    /** ids 순서대로 정렬 순서를 다시 매긴다. 본인 목록 전체를 정확히 포함해야 한다. */
    @Override
    @Transactional
    public void reorder(WatchlistDto.ReorderCommand command) {
        List<WatchlistItem> items = watchlistItemRepository.findByUserEmailOrderBySortOrderAscIdAsc(command.userEmail());
        Map<Long, WatchlistItem> byId = items.stream().collect(Collectors.toMap(WatchlistItem::getId, Function.identity()));
        if (command.ids().size() != items.size() || !byId.keySet().equals(new HashSet<>(command.ids()))) {
            throw MarketException.badRequest("정렬할 관심종목 목록이 현재 목록과 일치하지 않습니다.");
        }
        for (int i = 0; i < command.ids().size(); i++) {
            byId.get(command.ids().get(i)).changeSortOrder(i);
        }
    }
}
