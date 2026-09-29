package io.tbill.backendapi.presentation.content.dto;

import io.tbill.backendapi.domain.content.dto.ContentDto;
import io.tbill.backendapi.domain.content.entity.ContentCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 커뮤니티 요청 본문. 응답은 도메인 조회 record(ContentDto.ListItem·Detail 등)를 그대로 쓴다.
 */
public class ContentApiDto {

    public record CreateRequest(
            @NotNull(message = "게시판을 선택하세요.") ContentCategory category,
            @NotBlank(message = "제목은 필수입니다.") @Size(max = 200, message = "제목은 200자 이하여야 합니다.") String title,
            String body
    ) {
        public ContentDto.CreateCommand toCommand(String authorEmail, boolean admin) {
            return new ContentDto.CreateCommand(authorEmail, category, title, body, admin);
        }
    }

    public record UpdateRequest(
            @NotBlank(message = "제목은 필수입니다.") @Size(max = 200, message = "제목은 200자 이하여야 합니다.") String title,
            String body
    ) {
        public ContentDto.UpdateCommand toCommand(Long id, String authorEmail) {
            return new ContentDto.UpdateCommand(id, authorEmail, title, body);
        }
    }

    public record CommentRequest(
            @NotBlank(message = "댓글 내용을 입력하세요.") @Size(max = 2000, message = "댓글은 2000자 이하여야 합니다.") String comment
    ) {}

    /** 매매일지 공유. hideAmounts: 수량·실현손익 금액을 빼고 수익률·R 배수만 공개 */
    public record JournalShareRequest(
            @NotBlank(message = "제목은 필수입니다.") @Size(max = 200) String title,
            String body,
            boolean hideAmounts
    ) {}

    /** 전략 공유. backtestRequestId: 이 전략(현재 설정)으로 실행한 백테스트 결과를 성과로 첨부 (선택) */
    public record StrategyShareRequest(
            @NotBlank(message = "제목은 필수입니다.") @Size(max = 200) String title,
            String body,
            String backtestRequestId
    ) {}
}
