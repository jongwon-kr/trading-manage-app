package io.tbill.backendapi.domain.auth.service;

import io.tbill.backendapi.domain.auth.dto.AuthDto;
import io.tbill.backendapi.domain.user.dto.UserDto;
import io.tbill.backendapi.domain.user.entity.User;
import io.tbill.backendapi.domain.user.repository.UserRepository;
import io.tbill.backendapi.infrastructure.security.jwt.JwtProvider;
import io.tbill.backendapi.infrastructure.security.service.RefreshTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final RefreshTokenService refreshTokenService;

    @Value("${jwt.access-token-expiration-ms}")
    private long accessTokenExpirationMs;

    @Value("${jwt.refresh-token-expiration-ms}")
    private long refreshTokenExpirationMs;

    /**
     * 로그인
     */
    @Transactional
    public AuthDto.SignInInfo signIn(AuthDto.SignInCommand command) {
        User user = userRepository.findByEmail(command.getEmail())
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다."));

        if (!passwordEncoder.matches(command.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
        }

        Authentication authentication = new UsernamePasswordAuthenticationToken(user.getEmail(), user.getPassword());

        AuthDto.TokenInfo tokenInfo = generateTokens(authentication);

        return AuthDto.SignInInfo.builder()
                .userInfo(UserDto.UserInfo.from(user))
                .tokenInfo(tokenInfo)
                .build();
    }

    /**
     * 로그아웃
     */
    @Transactional
    public void logout(String email) {
        refreshTokenService.deleteToken(email);
    }

    /**
     * 토큰 재발급
     * [수정] 요청사항 반영: AccessToken만 갱신하고, RefreshToken은 갱신하지 않음.
     */
    @Transactional
    public AuthDto.SignInInfo reissueTokens(String refreshToken) {
        // 1. Refresh Token 검증
        if (!jwtProvider.validateToken(refreshToken)) {
            throw new IllegalArgumentException("유효하지 않은 Refresh Token입니다.");
        }

        // 2. Refresh Token에서 Authentication 정보 가져오기
        Authentication authentication = jwtProvider.getAuthentication(refreshToken);
        String email = authentication.getName();

        // 3. Redis의 Refresh Token과 일치하는지 확인
        String redisToken = refreshTokenService.getToken(email)
                .orElseThrow(() -> new IllegalArgumentException("로그아웃된 사용자입니다."));

        if (!redisToken.equals(refreshToken)) {
            throw new IllegalArgumentException("Refresh Token이 일치하지 않습니다.");
        }

        // 4. [수정] AccessToken만 새로 생성 (만료시간 = 현재 + 30분)
        long now = (new Date()).getTime();
        long newAccessTokenExpiresAt = now + accessTokenExpirationMs;
        String newAccessToken = jwtProvider.generateAccessToken(authentication, newAccessTokenExpiresAt);

        // 5. [수정] 새 TokenInfo DTO 생성 (RefreshToken 관련 정보는 기존 값/null)
        AuthDto.TokenInfo tokenInfo = AuthDto.TokenInfo.builder()
                .accessToken(newAccessToken)
                .accessTokenExpirationMs(accessTokenExpirationMs)
                .accessTokenExpiresAt(newAccessTokenExpiresAt)
                .refreshToken(refreshToken) // RefreshToken은 기존 값
                .refreshTokenExpirationMs(refreshTokenExpirationMs) // 유효기간도 기존 값
                .build();

        // 6. 사용자 정보 조회
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다."));

        // 7. 응답 반환
        return AuthDto.SignInInfo.builder()
                .userInfo(UserDto.UserInfo.from(user))
                .tokenInfo(tokenInfo)
                .build();
    }


    /**
     * (공통) Access/Refresh 토큰 생성 및 Redis 저장 (로그인 시 사용)
     */
    private AuthDto.TokenInfo generateTokens(Authentication authentication) {
        String email = authentication.getName();

        long now = (new Date()).getTime();
        long accessTokenExpiresAt = now + accessTokenExpirationMs;

        String accessToken = jwtProvider.generateAccessToken(authentication, accessTokenExpiresAt);
        String refreshToken = jwtProvider.generateRefreshToken(authentication);

        // Redis에 Refresh Token 저장
        refreshTokenService.saveToken(email, refreshToken);

        return AuthDto.TokenInfo.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .accessTokenExpirationMs(accessTokenExpirationMs)
                .refreshTokenExpirationMs(refreshTokenExpirationMs)
                .accessTokenExpiresAt(accessTokenExpiresAt)
                .build();
    }
}