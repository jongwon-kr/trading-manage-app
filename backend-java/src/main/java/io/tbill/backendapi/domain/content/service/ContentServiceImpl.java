package io.tbill.backendapi.domain.content.service;

import io.tbill.backendapi.domain.content.dto.ContentDto;
import io.tbill.backendapi.domain.content.entity.Content;
import io.tbill.backendapi.domain.content.repository.ContentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ContentServiceImpl implements ContentService {

    private final ContentRepository contentRepository;
    // private final UserService userService; // (확장) 사용자 존재 여부 검증용

    // (공통) 게시글 찾기 및 권한 확인
    private Content findContentByIdAndValidateOwner(Long contentId, String authorEmail) {
        // (주의) 여기서는 findByIdNotDeleted가 아닌 JpaRepository 기본 메서드 사용
        // 이미 삭제된 게시글을 수정/삭제하려는 시도를 막기 위해
        Content content = contentRepository.findById(contentId)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다. ID: " + contentId));

        // (소프트 삭제) 이미 삭제된 게시글인지 확인
        if (content.getIsDeleted()) {
            throw new IllegalArgumentException("이미 삭제된 게시글입니다.");
        }

        // 작성자 본인인지 확인
        if (!content.getAuthorEmail().equals(authorEmail)) {
            throw new RuntimeException("게시글에 대한 권한이 없습니다."); // (개선) AccessDeniedException
        }
        return content;
    }

    @Override
    @Transactional
    public ContentDto.SimpleResponse createContent(ContentDto.CreateCommand command) {
        // (확장) command.getAuthorEmail()로 실제 사용자가 존재하는지 확인할 수 있음
        // userService.validateUserExists(command.getAuthorEmail());

        Content content = command.toEntity();
        Content savedContent = contentRepository.save(content);
        return ContentDto.SimpleResponse.from(savedContent);
    }

    @Override
    @Transactional
    public ContentDto.DetailResponse getContentById(Long contentId) {
        // 1. (소프트 삭제) 삭제되지 않은 게시글 조회 (댓글 포함 Fetch Join)
        Content content = contentRepository.findByIdNotDeleted(contentId)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없거나 삭제되었습니다. ID: " + contentId));

        // 2. (중요) 조회수 증가 (Dirty Checking)
        content.increaseViewCount();

        // 3. DTO 변환 (댓글 목록 포함)
        return ContentDto.DetailResponse.from(content);
    }

    @Override
    public Page<ContentDto.SimpleResponse> getContentList(Pageable pageable) {
        // (소프트 삭제) 삭제되지 않은 게시글만 페이징 조회
        Page<Content> contents = contentRepository.findAllNotDeleted(pageable);

        // Page<Entity> -> Page<DTO> 변환
        return contents.map(ContentDto.SimpleResponse::from);
    }

    @Override
    @Transactional
    public ContentDto.DetailResponse updateContent(Long contentId, String authorEmail, ContentDto.CreateCommand command) {
        // 1. 게시글 찾기 및 작성자 권한 검증
        Content content = findContentByIdAndValidateOwner(contentId, authorEmail);

        // 2. 수정 (Dirty Checking)
        content.update(
                command.getCategory(),
                command.getTitle(),
                command.getContentBody()
        );

        // 3. 수정된 상세 정보 반환
        return ContentDto.DetailResponse.from(content);
    }

    @Override
    @Transactional
    public void deleteContent(Long contentId, String authorEmail) {
        // 1. 게시글 찾기 및 작성자 권한 검증
        Content content = findContentByIdAndValidateOwner(contentId, authorEmail);

        // 2. 소프트 삭제 (Dirty Checking)
        content.softDelete();
    }
}