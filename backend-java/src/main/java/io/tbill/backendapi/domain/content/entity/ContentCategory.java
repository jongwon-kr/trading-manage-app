package io.tbill.backendapi.domain.content.entity;

public enum ContentCategory {
    NOTICE, // 공지사항 (관리자만 작성)
    FREE_BOARD, // 자유게시판
    JOURNAL_SHARE, // 매매일지 공유 (공유 API 로만 생성)
    STRATEGY_SHARE, // 전략 공유 (공유 API 로만 생성)
    QNA, // 질문 답변
    FAQ, // 자주 묻는 질문 (미사용, 기존 데이터 호환)
    GALLERY // 이미지 게시판 (미사용, 기존 데이터 호환)
}
