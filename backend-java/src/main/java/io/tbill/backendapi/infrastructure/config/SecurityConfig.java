package io.tbill.backendapi.infrastructure.config;

import io.tbill.backendapi.infrastructure.security.handler.JwtAccessDeniedHandler;
import io.tbill.backendapi.infrastructure.security.handler.JwtAuthenticationEntryPoint;
import io.tbill.backendapi.infrastructure.security.jwt.JwtAuthenticationFilter;
import io.tbill.backendapi.infrastructure.security.jwt.JwtProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity // @PreAuthorize 등 메서드 수준 보안 활성화
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtProvider jwtProvider;
    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;
    private final JwtAccessDeniedHandler jwtAccessDeniedHandler;

    // 인증이 필요 없는 PUBLIC 경로
    private static final String[] PUBLIC_PATHS = {
            "/api/users/sign-up", // 회원가입
            "/api/auth/sign-in",  // 로그인
            "/api/auth/refresh",  // 토큰 재발급

            // Swagger UI
            "/swagger-ui/**",
            "/v3/api-docs/**",
    };

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 1. 기본 설정 비활성화
                .csrf(AbstractHttpConfigurer::disable) // CSRF 비활성화
                .httpBasic(AbstractHttpConfigurer::disable) // HTTP Basic 비활성화
                .formLogin(AbstractHttpConfigurer::disable) // Form Login 비활성화

                // 2. 세션 관리: STATELESS (JWT 사용)
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // 3. CORS 설정
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // 4. API 경로별 권한 설정
                .authorizeHttpRequests(authz -> authz
                        .requestMatchers(PUBLIC_PATHS).permitAll() // PUBLIC 경로는 모두 허용
                        .anyRequest().authenticated() // 그 외 모든 경로는 인증 필요
                )

                // 5. JWT 필터 추가
                // JwtAuthenticationFilter를 UsernamePasswordAuthenticationFilter 전에 추가
                .addFilterBefore(new JwtAuthenticationFilter(jwtProvider),
                        UsernamePasswordAuthenticationFilter.class)

                // 6. 예외 처리 핸들러
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(jwtAuthenticationEntryPoint) // 401 (인증 실패)
                        .accessDeniedHandler(jwtAccessDeniedHandler)        // 403 (권한 부족)
                );

        return http.build();
    }

    /**
     * CORS 설정 (Cross-Origin Resource Sharing)
     * (주의) 실제 운영 환경에서는 "allowedOrigins"를 구체적으로 명시해야 합니다.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true); // 쿠키 허용
        config.setAllowedOrigins(Arrays.asList("http://localhost:3000", "http://localhost:8080")); // (운영) 프론트엔드 주소
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(Arrays.asList("*")); // 모든 헤더 허용
        config.setExposedHeaders(Arrays.asList("Authorization")); // Access Token 헤더 노출

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}