package io.tbill.backendapi.domain.content.service;

import io.tbill.backendapi.domain.content.dto.ContentDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ContentService {

    /**
     * 게시글 생성
     */
    ContentDto.SimpleResponse createContent(ContentDto.CreateCommand command);

    /**
     * 게시글 상세 조회 (조회수 증가 포함)
     *
     * @param contentId 조회할 게시글 ID
     * @return 게시글 상세 정보 (댓글 포함)
     */
    ContentDto.DetailResponse getContentById(Long contentId);

    /**
     * 게시글 목록 조회 (페이징)
     *
     * @param pageable 페이징 정보 (예: page=0, size=10)
     * @return 페이징된 게시글 목록 (댓글 미포함)
     */
    Page<ContentDto.SimpleResponse> getContentList(Pageable pageable);

    /**
     * 게시글 수정
     *
     * @param contentId   수정할 게시글 ID
     * @param authorEmail 수정 요청자 이메일 (권한 확인용)
     * @param command     수정할 내용 (Category, Title, ContentBody)
     * @return 수정된 게시글 정보 (댓글 포함)
     */
    ContentDto.DetailResponse updateContent(Long contentId, String authorEmail, ContentDto.CreateCommand command);

    /**
     * 게시글 소프트 삭제
     *
     * @param contentId   삭제할 게시글 ID
     * @param authorEmail 삭제 요청자 이메일 (권한 확인용)
     */
    void deleteContent(Long contentId, String authorEmail);
}