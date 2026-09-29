package io.tbill.backendapi.domain.content.service;

import io.tbill.backendapi.domain.content.dto.ContentDto;

public interface ContentService {

    ContentDto.PageResult<ContentDto.ListItem> search(ContentDto.SearchCondition condition);

    /** 상세 조회 (조회수 +1). 삭제됐거나, 숨김인데 작성자가 아니면 404 */
    ContentDto.Detail getContent(Long contentId, String viewerEmail);

    /** 자유게시판·질문 글 (공유 카테고리는 공유 API 로만) */
    ContentDto.Detail createContent(ContentDto.CreateCommand command);

    /** 매매일지·전략 공유 글 */
    ContentDto.Detail createAttachmentPost(ContentDto.AttachmentPostCommand command);

    ContentDto.Detail updateContent(ContentDto.UpdateCommand command);

    void deleteContent(Long contentId, String authorEmail);

    /** 좋아요 (멱등: 이미 눌렀으면 그대로) */
    ContentDto.LikeResult like(Long contentId, String userEmail);

    ContentDto.LikeResult unlike(Long contentId, String userEmail);
}
