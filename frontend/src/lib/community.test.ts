import { describe, expect, it } from "vitest";
import { notificationText, timeAgo } from "./community";

describe("timeAgo", () => {
  const now = Date.parse("2026-09-29T12:00:00");
  it("상대 시간", () => {
    expect(timeAgo("2026-09-29T11:59:30", now)).toBe("방금");
    expect(timeAgo("2026-09-29T11:15:00", now)).toBe("45분 전");
    expect(timeAgo("2026-09-29T09:00:00", now)).toBe("3시간 전");
    expect(timeAgo("2026-09-27T12:00:00", now)).toBe("2일 전");
    expect(timeAgo("bad", now)).toBe("");
  });
});

describe("notificationText", () => {
  it("유형별 문구", () => {
    const base = { id: 1, contentId: 3, read: false, createdAt: "" };
    expect(notificationText({ ...base, type: "COMMENT", actorName: "비", message: "삼성 매매" }))
      .toBe("비님이 ‘삼성 매매’에 댓글을 남겼습니다.");
    expect(notificationText({ ...base, type: "FOLLOW", actorName: "비", message: null })).toBe("비님이 나를 팔로우합니다.");
  });
});
