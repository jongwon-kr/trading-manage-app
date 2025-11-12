package io.tbill.backendapi.infrastructure.config;

import io.tbill.backendapi.infrastructure.security.handler.JwtAccessDeniedHandler;
import io.tbill.backendapi.infrastructure.security.handler.JwtAuthenticationEntryPoint;
import io.tbill.backendapi.infrastructure.security.jwt.JwtAuthenticationFilter;
import io.tbill.backendapi.infrastructure.security.jwt.JwtProvider;
import io.tbill.backendapi.infrastructure.security.jwt.CookieUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
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
import java.util.List; // [필수] java.util.List 임포트

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtProvider jwtProvider;
    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;
    private final JwtAccessDeniedHandler jwtAccessDeniedHandler;
    private final CookieUtil cookieUtil;

    // 인증이 필요 없는 PUBLIC 경로
    private static final String[] PUBLIC_PATHS = {
            // 인증
            "/api/auth/**",
            "/api/users/sign-up",
            "/api/users/check-username",

            // Swagger UI
            "/swagger-ui/**",
            "/v3/api-docs/**",

            // Python Service
            "/api/analysis/**",

            // Actuator
            "/actuator/**",
    };

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 1. 기본 설정 비활성화
                .csrf(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)

                // 2. 세션 관리: STATELESS (JWT 사용)
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // 3. CORS 설정 (이것이 OPTIONS 요청을 처리해야 함)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // 4. API 경로별 권한 설정
                .authorizeHttpRequests(authz -> authz
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(PUBLIC_PATHS).permitAll() // PUBLIC 경로는 모두 허용
                        .anyRequest().authenticated() // 그 외 모든 경로는 인증 필요
                )

                // 5. JWT 필터 추가 (Authorization 헤더를 검사)
                .addFilterBefore(new JwtAuthenticationFilter(jwtProvider, cookieUtil),
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
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        config.setAllowedOrigins(Arrays.asList("http://localhost:3000", "http://localhost:8080", "http://localhost:5173"));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(Arrays.asList("*"));
        config.setExposedHeaders(List.of("access", "Authorization"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}