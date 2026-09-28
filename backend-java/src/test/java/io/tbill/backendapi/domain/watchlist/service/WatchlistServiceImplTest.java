package io.tbill.backendapi.domain.watchlist.service;

import io.tbill.backendapi.domain.market.dto.MarketDto;
import io.tbill.backendapi.domain.market.entity.InstrumentMarket;
import io.tbill.backendapi.domain.watchlist.dto.WatchlistDto;
import io.tbill.backendapi.domain.watchlist.entity.WatchlistItem;
import io.tbill.backendapi.domain.watchlist.repository.WatchlistItemRepository;
import io.tbill.backendapi.global.exception.MarketException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WatchlistServiceImplTest {

    private static final String EMAIL = "a@b.c";

    @Mock
    private WatchlistItemRepository repository;
    @Mock
    private io.tbill.backendapi.infrastructure.client.python.PythonMarketClient pythonMarketClient;
    @InjectMocks
    private WatchlistServiceImpl service;

    private WatchlistItem item(long id, int order) {
        WatchlistItem w = WatchlistItem.builder().userEmail(EMAIL).market(InstrumentMarket.CRYPTO)
                .code("KRW-C" + id).name("coin" + id).sortOrder(order).build();
        ReflectionTestUtils.setField(w, "id", id);
        return w;
    }

    @Test
    @DisplayName("추가: 종목명은 심볼 마스터에서 가져오고 순서는 맨 뒤")
    void add() {
        when(repository.existsByUserEmailAndMarketAndCode(EMAIL, InstrumentMarket.KR_STOCK, "005930")).thenReturn(false);
        when(repository.countByUserEmail(EMAIL)).thenReturn(3L);
        when(repository.findMaxSortOrder(EMAIL)).thenReturn(2);
        when(pythonMarketClient.getSymbol(InstrumentMarket.KR_STOCK, "005930")).thenReturn(
                new MarketDto.SymbolInfo(InstrumentMarket.KR_STOCK, "KOSPI", "005930", "삼성전자", null, "KRW", null, 0, null));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        WatchlistDto.ItemInfo info = service.addItem(new WatchlistDto.AddCommand(EMAIL, InstrumentMarket.KR_STOCK, "005930"));

        assertThat(info.name()).isEqualTo("삼성전자");
        assertThat(info.sortOrder()).isEqualTo(3);
    }

    @Test
    @DisplayName("중복 추가는 409, 50개 초과는 400")
    void addValidation() {
        when(repository.existsByUserEmailAndMarketAndCode(EMAIL, InstrumentMarket.CRYPTO, "KRW-BTC")).thenReturn(true);
        assertThatThrownBy(() -> service.addItem(new WatchlistDto.AddCommand(EMAIL, InstrumentMarket.CRYPTO, "KRW-BTC")))
                .satisfies(e -> assertThat(((MarketException) e).getStatus()).isEqualTo(HttpStatus.CONFLICT));

        when(repository.existsByUserEmailAndMarketAndCode(EMAIL, InstrumentMarket.CRYPTO, "KRW-ETH")).thenReturn(false);
        when(repository.countByUserEmail(EMAIL)).thenReturn(50L);
        assertThatThrownBy(() -> service.addItem(new WatchlistDto.AddCommand(EMAIL, InstrumentMarket.CRYPTO, "KRW-ETH")))
                .satisfies(e -> assertThat(((MarketException) e).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("다른 사용자의 항목은 삭제할 수 없다 (404)")
    void removeOwnerCheck() {
        when(repository.findByIdAndUserEmail(9L, EMAIL)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.removeItem(9L, EMAIL))
                .satisfies(e -> assertThat(((MarketException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(repository, never()).delete(any());
    }

    @Test
    @DisplayName("순서 변경은 전체 목록과 정확히 일치해야 한다")
    void reorder() {
        WatchlistItem a = item(1, 0), b = item(2, 1), c = item(3, 2);
        when(repository.findByUserEmailOrderBySortOrderAscIdAsc(EMAIL)).thenReturn(List.of(a, b, c));

        service.reorder(new WatchlistDto.ReorderCommand(EMAIL, List.of(3L, 1L, 2L)));
        assertThat(List.of(c.getSortOrder(), a.getSortOrder(), b.getSortOrder())).containsExactly(0, 1, 2);

        assertThatThrownBy(() -> service.reorder(new WatchlistDto.ReorderCommand(EMAIL, List.of(1L, 2L))))
                .isInstanceOf(MarketException.class);
        assertThatThrownBy(() -> service.reorder(new WatchlistDto.ReorderCommand(EMAIL, List.of(1L, 2L, 99L))))
                .isInstanceOf(MarketException.class);
    }

    @Test
    @DisplayName("저장되는 엔티티에는 사용자 이메일이 들어간다")
    void savedWithOwner() {
        when(repository.findMaxSortOrder(EMAIL)).thenReturn(-1);
        when(pythonMarketClient.getSymbol(InstrumentMarket.US_STOCK, "AAPL")).thenReturn(
                new MarketDto.SymbolInfo(InstrumentMarket.US_STOCK, "NASDAQ", "AAPL", "Apple Inc.", null, "USD", null, 2, null));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        service.addItem(new WatchlistDto.AddCommand(EMAIL, InstrumentMarket.US_STOCK, "AAPL"));
        ArgumentCaptor<WatchlistItem> captor = ArgumentCaptor.forClass(WatchlistItem.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getUserEmail()).isEqualTo(EMAIL);
        assertThat(captor.getValue().getSortOrder()).isZero();
    }
}
