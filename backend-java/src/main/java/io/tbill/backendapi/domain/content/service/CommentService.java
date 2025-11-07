package io.tbill.backendapi.domain.content.service;

import io.tbill.backendapi.domain.content.dto.CommentDto;

public interface CommentService {

    /**
     * 댓글 생성
     *
     * @param contentId   댓글을 달 게시글 ID
     * @param authorEmail 작성자 이메일
     * @param contentBody 댓글 내용
     * @return 생성된 댓글 정보
     */
    CommentDto.Info createComment(Long contentId, String authorEmail, String contentBody);

    /**
     * 댓글 수정
     *
     * @param commentId   수정할 댓글 ID
     * @param authorEmail 수정 요청자 이메일 (권한 확인용)
     * @param contentBody 새 댓글 내용
     * @return 수정된 댓글 정보
     */
    CommentDto.Info updateComment(Long commentId, String authorEmail, String contentBody);

    /**
     * 댓글 소프트 삭제
     *
     * @param commentId   삭제할 댓글 ID
     * @param authorEmail 삭제 요청자 이메일 (권한 확인용)
     */
    void deleteComment(Long commentId, String authorEmail);
}