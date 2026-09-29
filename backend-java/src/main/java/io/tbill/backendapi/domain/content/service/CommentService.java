package io.tbill.backendapi.domain.content.service;

import io.tbill.backendapi.domain.content.dto.ContentDto;

public interface CommentService {

    ContentDto.CommentInfo createComment(Long contentId, String authorEmail, String comment);

    ContentDto.CommentInfo updateComment(Long commentId, String authorEmail, String comment);

    void deleteComment(Long commentId, String authorEmail);
}
