package io.tbill.backendapi.global.exception;

import org.springframework.http.HttpStatus;

/**
 * 커뮤니티(게시글·댓글·좋아요·공유) 예외. MarketException 과 같은 {code, message} 응답으로 처리된다.
 */
public class CommunityException extends MarketException {

    public CommunityException(String code, HttpStatus status, String message) {
        super(code, status, message);
    }

    public static CommunityException notFound(String message) {
        return new CommunityException("COMMUNITY_NOT_FOUND", HttpStatus.NOT_FOUND, message);
    }

    public static CommunityException forbidden(String message) {
        return new CommunityException("COMMUNITY_FORBIDDEN", HttpStatus.FORBIDDEN, message);
    }

    public static CommunityException badRequest(String message) {
        return new CommunityException("COMMUNITY_BAD_REQUEST", HttpStatus.BAD_REQUEST, message);
    }

    public static CommunityException conflict(String message) {
        return new CommunityException("COMMUNITY_CONFLICT", HttpStatus.CONFLICT, message);
    }
}
