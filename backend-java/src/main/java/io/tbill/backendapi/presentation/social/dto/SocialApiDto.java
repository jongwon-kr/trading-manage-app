package io.tbill.backendapi.presentation.social.dto;

import io.tbill.backendapi.domain.social.dto.SocialDto;
import io.tbill.backendapi.domain.social.entity.ReportReason;
import io.tbill.backendapi.domain.social.entity.ReportTarget;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class SocialApiDto {

    public record ReportRequest(
            @NotNull(message = "신고 사유를 선택하세요.") ReportReason reason,
            @Size(max = 500, message = "메모는 500자 이하여야 합니다.") String memo
    ) {
        public SocialDto.ReportCommand toCommand(String reporterEmail, ReportTarget type, Long targetId) {
            return new SocialDto.ReportCommand(reporterEmail, type, targetId, reason, memo);
        }
    }

    /** 관리자 신고 처리: hide=true 면 대상 숨김, false 면 기각 */
    public record ResolveRequest(boolean hide) {}
}
