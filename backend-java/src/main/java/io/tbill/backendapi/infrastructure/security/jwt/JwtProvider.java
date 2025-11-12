package io.tbill.backendapi.infrastructure.security.jwt;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import io.tbill.backendapi.infrastructure.security.service.CustomUserDetailsService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtProvider {

    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.refresh-token-expiration-ms}")
    private long refreshTokenExpirationMs;

    private Key key;

    private final CustomUserDetailsService userDetailsService;

    @PostConstruct
    public void init() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        this.key = Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * Access Token 생성
     * [수정] AuthServiceImpl에서 계산한 만료 시점(expiresAt)을 파라미터로 받음
     */
    public String generateAccessToken(Authentication authentication, long expiresAt) {
        return generateToken(authentication.getName(), expiresAt);
    }

    /**
     * Refresh Token 생성
     */
    public String generateRefreshToken(Authentication authentication) {
        long now = (new Date()).getTime();
        long expiration = now + refreshTokenExpirationMs;
        return generateToken(authentication.getName(), expiration);
    }

    /**
     * [수정] 토큰 생성 로직 (만료 시점 타임스탬프를 받음)
     */
    private String generateToken(String subject, long expiresAt) {
        Date now = new Date();
        Date expirationDate = new Date(expiresAt);

        return Jwts.builder()
                .setSubject(subject) // 사용자 식별자 (email)
                .setIssuedAt(now)
                .setExpiration(expirationDate)
                .signWith(key, SignatureAlgorithm.HS512)
                .compact();
    }

    /**
     * 토큰 검증
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return true;
        } catch (io.jsonwebtoken.security.SecurityException | MalformedJwtException e) {
            log.warn("잘못된 JWT 서명입니다.");
        } catch (ExpiredJwtException e) {
            log.warn("만료된 JWT 토큰입니다.");
        } catch (UnsupportedJwtException e) {
            log.warn("지원되지 않는 JWT 토큰입니다.");
        } catch (IllegalArgumentException e) {
            log.warn("JWT 토큰이 잘못되었습니다.");
        }
        return false;
    }

    /**
     * 토큰에서 인증 정보(Authentication) 조회
     */
    public Authentication getAuthentication(String token) {
        Claims claims = parseClaims(token);
        String email = claims.getSubject();

        UserDetails userDetails = userDetailsService.loadUserByUsername(email);

        return new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
    }

    /**
     * 토큰에서 Claims 정보 파싱
     */
    private Claims parseClaims(String token) {
        try {
            return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
        } catch (ExpiredJwtException e) {
            return e.getClaims(); // 토큰이 만료되어도 클레임은 반환 (예: 재발급 시)
        }
    }
}