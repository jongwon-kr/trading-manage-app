package io.tbill.backendapi.domain.auth.service;

import io.tbill.backendapi.domain.auth.dto.AuthDto;
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

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final RefreshTokenService refreshTokenService;

    @Value("${jwt.refresh-token-expiration-ms}")
    private long refreshTokenExpirationMs;

    /**
     * 로그인
     */
    @Transactional
    public AuthDto.SignInInfo signIn(AuthDto.SignInCommand command) {
        // 1. 사용자 조회
        User user = userRepository.findByEmail(command.getEmail())
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다."));

        // 2. 비밀번호 검증
        if (!passwordEncoder.matches(command.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
        }

        // 3. 인증 객체 생성
        Authentication authentication = new UsernamePasswordAuthenticationToken(user.getEmail(), user.getPassword());

        // 4. 토큰 생성
        AuthDto.TokenInfo tokenInfo = generateTokens(authentication);

        // 5. 로그인 응답 반환
        return AuthDto.SignInInfo.builder()
                .username(user.getUsername())
                .email(user.getEmail())
                .tokenInfo(tokenInfo)
                .build();
    }

    /**
     * 로그아웃
     */
    @Transactional
    public void logout(String email) {
        // Redis에서 Refresh Token 삭제
        refreshTokenService.deleteToken(email);
    }

    /**
     * 토큰 재발급
     */
    @Transactional
    public AuthDto.TokenInfo reissueTokens(String refreshToken) {
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

        // 4. 새 토큰 생성 및 반환
        return generateTokens(authentication);
    }


    /**
     * (공통) Access/Refresh 토큰 생성 및 Redis 저장
     */
    private AuthDto.TokenInfo generateTokens(Authentication authentication) {
        String email = authentication.getName();

        String accessToken = jwtProvider.generateAccessToken(authentication);
        String refreshToken = jwtProvider.generateRefreshToken(authentication);

        // Redis에 Refresh Token 저장
        refreshTokenService.saveToken(email, refreshToken);

        return AuthDto.TokenInfo.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .refreshTokenExpirationMs(refreshTokenExpirationMs)
                .build();
    }
}