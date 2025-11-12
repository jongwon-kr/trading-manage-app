package io.tbill.backendapi.infrastructure.security.jwt;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders; // [추가]
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtProvider jwtProvider;
    private final CookieUtil cookieUtil; // [수정] final로 선언 (RequiredArgsConstructor가 처리)
    private static final String BEARER_PREFIX = "Bearer "; // [추가]

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        // 1. [수정] Request Header에서 Access Token 추출
        String authorizationHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        String accessToken = null;

        if (authorizationHeader != null && authorizationHeader.startsWith(BEARER_PREFIX)) {
            accessToken = authorizationHeader.substring(BEARER_PREFIX.length());
        }

        // 2. Access Token 검증
        if (StringUtils.hasText(accessToken) && jwtProvider.validateToken(accessToken)) {
            // 토큰이 유효하면 인증 정보를 SecurityContext에 저장
            Authentication authentication = jwtProvider.getAuthentication(accessToken);
            SecurityContextHolder.getContext().setAuthentication(authentication);
            log.debug("Security Context에 '{}' 인증 정보를 저장했습니다. uri: {}", authentication.getName(), request.getRequestURI());
        } else {
            log.debug("유효한 JWT 토큰이 없습니다. uri: {}", request.getRequestURI());
        }

        filterChain.doFilter(request, response);
    }
}