package io.tbill.backendapi.presentation.auth.controller;

import io.tbill.backendapi.domain.auth.dto.AuthDto;
import io.tbill.backendapi.domain.auth.service.AuthService;
import io.tbill.backendapi.infrastructure.security.jwt.CookieUtil;
import io.tbill.backendapi.presentation.auth.dto.AuthApiDto;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final CookieUtil cookieUtil;

    /**
     * 로그인
     * [POST] /api/auth/sign-in
     */
    @PostMapping("/sign-in")
    public ResponseEntity<AuthApiDto.TokenResponse> signIn(
            @RequestBody AuthApiDto.SignInRequest request,
            HttpServletResponse response
    ) {
        // 1. Service 호출
        AuthDto.SignInInfo signInInfo = authService.signIn(request.toCommand());
        AuthDto.TokenInfo tokenInfo = signInInfo.getTokenInfo();

        // 2. Refresh Token을 HttpOnly 쿠키에 저장
        cookieUtil.createRefreshTokenCookie(
                response,
                tokenInfo.getRefreshToken(),
                tokenInfo.getRefreshTokenExpirationMs() / 1000 // (ms -> s)
        );

        // 3. Access Token을 Response Header와 Body에 담아 반환
        return ResponseEntity.ok()
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenInfo.getAccessToken())
                .body(new AuthApiDto.TokenResponse(tokenInfo.getAccessToken()));
    }

    /**
     * 토큰 재발급
     * [POST] /api/auth/refresh
     */
    @PostMapping("/refresh")
    public ResponseEntity<AuthApiDto.TokenResponse> refresh(
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        // 1. 쿠키에서 Refresh Token 읽기
        String refreshToken = cookieUtil.getRefreshToken(request)
                .orElseThrow(() -> new IllegalArgumentException("Refresh Token 쿠키를 찾을 수 없습니다."));

        // 2. Service 호출 (토큰 재발급)
        AuthDto.TokenInfo tokenInfo = authService.reissueTokens(refreshToken);

        // 3. 새 Refresh Token을 쿠키에 저장
        cookieUtil.createRefreshTokenCookie(
                response,
                tokenInfo.getRefreshToken(),
                tokenInfo.getRefreshTokenExpirationMs() / 1000
        );

        // 4. 새 Access Token 반환
        return ResponseEntity.ok()
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenInfo.getAccessToken())
                .body(new AuthApiDto.TokenResponse(tokenInfo.getAccessToken()));
    }

    /**
     * 로그아웃
     * [POST] /api/auth/logout
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        // (인증된 사용자만 로그아웃 가능하도록 SecurityConfig에서 /api/auth/logout은 authenticated()로 설정)
        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        // 1. Service 호출 (Redis 토큰 삭제)
        authService.logout(email);

        // 2. 쿠키 삭제
        cookieUtil.deleteRefreshTokenCookie(response);

        return ResponseEntity.ok().build();
    }
}