import { baseApi } from "./base.api";
import { API_ENDPOINTS } from "@/utils/constants";
import type { StrategyPreset } from "@/types/model.types";
import type {
  CommentInfo,
  ContentCategory,
  ContentDetail,
  ContentListItem,
  ContentQuery,
  NotificationInfo,
  PageResult,
  Profile,
  ReportInfo,
  ReportReason,
  ReportStatus,
} from "@/types/community.types";

const C = API_ENDPOINTS.COMMUNITY;

/** 커뮤니티·팔로우·알림·신고·관리자 API (모두 로그인 필요) */
export const communityApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getContents: build.query<PageResult<ContentListItem>, ContentQuery>({
      query: (params) => ({ url: C.CONTENTS, params }),
      providesTags: [{ type: "Content", id: "LIST" }],
    }),
    getContent: build.query<ContentDetail, number>({
      query: (id) => ({ url: C.CONTENT(id) }),
      providesTags: (_r, _e, id) => [{ type: "Content", id }],
    }),
    createContent: build.mutation<ContentDetail, { category: ContentCategory; title: string; body: string }>({
      query: (data) => ({ url: C.CONTENTS, method: "POST", data }),
      invalidatesTags: [{ type: "Content", id: "LIST" }, "Profile"],
    }),
    updateContent: build.mutation<ContentDetail, { id: number; title: string; body: string }>({
      query: ({ id, ...data }) => ({ url: C.CONTENT(id), method: "PUT", data }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Content", id }, { type: "Content", id: "LIST" }],
    }),
    deleteContent: build.mutation<void, number>({
      query: (id) => ({ url: C.CONTENT(id), method: "DELETE" }),
      invalidatesTags: [{ type: "Content", id: "LIST" }, "Profile"],
    }),
    setLike: build.mutation<{ liked: boolean; likeCount: number }, { id: number; like: boolean }>({
      query: ({ id, like }) => ({ url: C.LIKE(id), method: like ? "POST" : "DELETE" }),
      // 낙관적 업데이트: 상세 캐시의 좋아요 표시를 먼저 바꾸고 실패하면 되돌린다
      async onQueryStarted({ id, like }, { dispatch, queryFulfilled }) {
        const patch = dispatch(communityApi.util.updateQueryData("getContent", id, (d) => {
          if (d.liked !== like) {
            d.liked = like;
            d.likeCount += like ? 1 : -1;
          }
        }));
        try {
          const { data } = await queryFulfilled;
          dispatch(communityApi.util.updateQueryData("getContent", id, (d) => {
            d.liked = data.liked;
            d.likeCount = data.likeCount;
          }));
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: [{ type: "Content", id: "LIST" }],
    }),
    createComment: build.mutation<CommentInfo, { contentId: number; comment: string }>({
      query: ({ contentId, comment }) => ({ url: C.COMMENTS(contentId), method: "POST", data: { comment } }),
      invalidatesTags: (_r, _e, { contentId }) => [{ type: "Content", id: contentId }, { type: "Content", id: "LIST" }],
    }),
    updateComment: build.mutation<CommentInfo, { id: number; contentId: number; comment: string }>({
      query: ({ id, comment }) => ({ url: C.COMMENT(id), method: "PUT", data: { comment } }),
      invalidatesTags: (_r, _e, { contentId }) => [{ type: "Content", id: contentId }],
    }),
    deleteComment: build.mutation<void, { id: number; contentId: number }>({
      query: ({ id }) => ({ url: C.COMMENT(id), method: "DELETE" }),
      invalidatesTags: (_r, _e, { contentId }) => [{ type: "Content", id: contentId }, { type: "Content", id: "LIST" }],
    }),
    shareJournal: build.mutation<ContentDetail, { journalId: number; title: string; body: string; hideAmounts: boolean }>({
      query: ({ journalId, ...data }) => ({ url: C.SHARE_JOURNAL(journalId), method: "POST", data }),
      invalidatesTags: [{ type: "Content", id: "LIST" }, "Profile"],
    }),
    shareStrategy: build.mutation<ContentDetail, { presetId: number; title: string; body: string; backtestRequestId?: string }>({
      query: ({ presetId, ...data }) => ({ url: C.SHARE_STRATEGY(presetId), method: "POST", data }),
      invalidatesTags: [{ type: "Content", id: "LIST" }, "Profile"],
    }),
    importStrategy: build.mutation<StrategyPreset, number>({
      query: (contentId) => ({ url: C.IMPORT_STRATEGY(contentId), method: "POST" }),
      invalidatesTags: (_r, _e, id) => [{ type: "Preset", id: "LIST" }, { type: "Content", id }],
    }),
    report: build.mutation<void, { kind: "content" | "comment"; id: number; reason: ReportReason; memo?: string }>({
      query: ({ kind, id, reason, memo }) => ({
        url: kind === "content" ? C.REPORT_CONTENT(id) : C.REPORT_COMMENT(id), method: "POST", data: { reason, memo },
      }),
    }),
    getProfile: build.query<Profile, string>({
      query: (username) => ({ url: C.PROFILE(username) }),
      providesTags: (_r, _e, u) => [{ type: "Profile", id: u }],
    }),
    setFollow: build.mutation<{ following: boolean; followerCount: number }, { username: string; follow: boolean }>({
      query: ({ username, follow }) => ({ url: C.FOLLOW(username), method: follow ? "POST" : "DELETE" }),
      invalidatesTags: (_r, _e, { username }) => [{ type: "Profile", id: username }, { type: "Content", id: "LIST" }],
    }),
    getNotifications: build.query<PageResult<NotificationInfo>, { unreadOnly?: boolean; page?: number; size?: number }>({
      query: (params) => ({ url: C.NOTIFICATIONS, params }),
      providesTags: ["Notification"],
    }),
    getUnreadCount: build.query<{ count: number }, void>({
      query: () => ({ url: C.UNREAD_COUNT }),
      providesTags: ["Notification"],
    }),
    markRead: build.mutation<void, number>({
      query: (id) => ({ url: C.READ(id), method: "POST" }),
      invalidatesTags: ["Notification"],
    }),
    markAllRead: build.mutation<void, void>({
      query: () => ({ url: C.READ_ALL, method: "POST" }),
      invalidatesTags: ["Notification"],
    }),
    getReports: build.query<PageResult<ReportInfo>, { status?: ReportStatus; page?: number }>({
      query: (params) => ({ url: C.ADMIN_REPORTS, params }),
      providesTags: ["Report"],
    }),
    resolveReport: build.mutation<void, { id: number; hide: boolean }>({
      query: ({ id, hide }) => ({ url: C.ADMIN_RESOLVE(id), method: "POST", data: { hide } }),
      invalidatesTags: ["Report", { type: "Content", id: "LIST" }],
    }),
    setHidden: build.mutation<void, { kind: "contents" | "comments"; id: number; hide: boolean }>({
      query: ({ kind, id, hide }) => ({ url: C.ADMIN_HIDE(kind, id, hide), method: "POST" }),
      invalidatesTags: ["Report", { type: "Content", id: "LIST" }],
    }),
  }),
});

export const {
  useGetContentsQuery,
  useGetContentQuery,
  useCreateContentMutation,
  useUpdateContentMutation,
  useDeleteContentMutation,
  useSetLikeMutation,
  useCreateCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
  useShareJournalMutation,
  useShareStrategyMutation,
  useImportStrategyMutation,
  useReportMutation,
  useGetProfileQuery,
  useSetFollowMutation,
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
  useGetReportsQuery,
  useResolveReportMutation,
  useSetHiddenMutation,
} = communityApi;
