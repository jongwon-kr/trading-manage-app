package io.tbill.backendapi.presentation.auth.controller;

import io.tbill.backendapi.domain.auth.dto.AuthDto;
import io.tbill.backendapi.domain.auth.service.AuthService;
import io.tbill.backendapi.infrastructure.security.jwt.CookieUtil;
import io.tbill.backendapi.presentation.auth.dto.AuthApiDto;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
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
     * [수정] 로그인 (AT는 'access' 헤더로, RT는 쿠키로)
     * [POST] /api/auth/sign-in
     */
    @PostMapping("/sign-in")
    public ResponseEntity<AuthApiDto.AuthResponse> signIn(
            @RequestBody AuthApiDto.SignInRequest request,
            HttpServletResponse response
    ) {
        AuthDto.SignInInfo signInInfo = authService.signIn(request.toCommand());
        AuthDto.TokenInfo tokenInfo = signInInfo.getTokenInfo();

        // 1. [수정] AccessToken은 'access' 헤더에 추가 (heroes 방식)
        response.setHeader("access", tokenInfo.getAccessToken());

        // 2. [유지] RefreshToken만 쿠키에 저장
        cookieUtil.createRefreshTokenCookie(
                response,
                tokenInfo.getRefreshToken(),
                tokenInfo.getRefreshTokenExpirationMs() / 1000
        );

        // 3. [수정] Body에서는 AT 제외
        return ResponseEntity.ok()
                .body(new AuthApiDto.AuthResponse(
                        signInInfo.getUserInfo(),
                        tokenInfo.getAccessTokenExpiresAt()
                ));
    }

    /**
     * [수정] 토큰 재발급 (RT는 쿠키로 받고, 새 AT는 'access' 헤더로 반환)
     * [POST] /api/auth/refresh
     */
    @PostMapping("/refresh")
    public ResponseEntity<AuthApiDto.AuthResponse> refresh(
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        // 1. 쿠키에서 Refresh Token 추출
        String refreshToken = cookieUtil.getRefreshToken(request)
                .orElseThrow(() -> new IllegalArgumentException("Refresh Token 쿠키를 찾을 수 없습니다."));

        // 2. 서비스 호출 (새 AT, 유저 정보 반환)
        AuthDto.SignInInfo signInInfo = authService.reissueTokens(refreshToken);
        AuthDto.TokenInfo tokenInfo = signInInfo.getTokenInfo();

        // 3. [수정] 새 AccessToken은 'access' 헤더에 추가 (heroes 방식)
        response.setHeader("access", tokenInfo.getAccessToken());

        // 4. [수정] Body에서는 AT 제외
        return ResponseEntity.ok()
                .body(new AuthApiDto.AuthResponse(
                        signInInfo.getUserInfo(),
                        tokenInfo.getAccessTokenExpiresAt()
                ));
    }

    /**
     * [수정] 로그아웃
     * [POST] /api/auth/logout
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {

        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        // 1. Redis에서 RT 삭제
        authService.logout(email);

        // 2. [수정] RefreshToken 쿠키만 삭제
        // [삭제] cookieUtil.deleteAccessTokenCookie(response);
        cookieUtil.deleteRefreshTokenCookie(response);

        return ResponseEntity.ok().build();
    }
}