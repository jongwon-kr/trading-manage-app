import { baseApi } from "./base.api";
import { API_ENDPOINTS } from "@/utils/constants";
import type { MarketCode } from "@/types/market.types";

export interface WatchlistItem {
  id: number;
  market: MarketCode;
  code: string;
  name: string;
  sortOrder: number;
  createdAt: string;
}

export const watchlistApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getWatchlist: build.query<WatchlistItem[], void>({
      query: () => ({ url: API_ENDPOINTS.WATCHLIST.BASE }),
      providesTags: ["Watchlist"],
    }),
    addWatchlistItem: build.mutation<WatchlistItem, { market: MarketCode; code: string; name?: string }>({
      query: ({ market, code }) => ({ url: API_ENDPOINTS.WATCHLIST.ITEMS, method: "POST", data: { market, code } }),
      // 낙관적 업데이트: 바로 목록에 보이고, 실패하면 되돌린다
      async onQueryStarted({ market, code, name }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          watchlistApi.util.updateQueryData("getWatchlist", undefined, (draft) => {
            draft.push({ id: -Date.now(), market, code, name: name ?? code, sortOrder: draft.length, createdAt: "" });
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: ["Watchlist"],
    }),
    removeWatchlistItem: build.mutation<void, number>({
      query: (id) => ({ url: API_ENDPOINTS.WATCHLIST.ITEM(id), method: "DELETE" }),
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          watchlistApi.util.updateQueryData("getWatchlist", undefined, (draft) => draft.filter((w) => w.id !== id))
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: ["Watchlist"],
    }),
  }),
});

export const { useGetWatchlistQuery, useAddWatchlistItemMutation, useRemoveWatchlistItemMutation } = watchlistApi;
