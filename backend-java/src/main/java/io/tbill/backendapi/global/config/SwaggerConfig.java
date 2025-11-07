package io.tbill.backendapi.global.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI openAPI() {
        // 1. API 기본 정보 설정
        Info info = new Info()
                .title("T-Bill Backend API") // build.gradle의 description 참고
                .version("v1.0.0")
                .description("T-Bill (Trading Bill) 프로젝트의 백엔드 API 명세서입니다.");

        // 2. JWT 인증을 위한 Security Scheme 설정 (Bearer Token)
        // (이후 JWT 구현 시 자동으로 연동됩니다.)
        String jwtSchemeName = "jwtAuth";

        SecurityRequirement securityRequirement = new SecurityRequirement()
                .addList(jwtSchemeName); // API 요청 시 인증 헤더에 jwtAuth 추가

        Components components = new Components()
                .addSecuritySchemes(jwtSchemeName, new SecurityScheme()
                        .name(jwtSchemeName)
                        .type(SecurityScheme.Type.HTTP) // HTTP 방식
                        .scheme("bearer")
                        .bearerFormat("JWT") // Bearer 토큰 형식
                        .in(SecurityScheme.In.HEADER)
                        .name("Authorization")); // 헤더 이름 (Spring Security 기본값)

        // 3. OpenAPI 객체 생성
        return new OpenAPI()
                .info(info)
                .addSecurityItem(securityRequirement) // 전역적으로 SecurityRequirement 설정
                .components(components); // SecurityScheme 컴포넌트 설정
    }
}