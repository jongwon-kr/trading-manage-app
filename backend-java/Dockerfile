# 1. Build Stage (빌드용 환경) - JDK 21 사용
# (AS BUILD -> AS build 로 수정하여 경고 제거)
FROM gradle:8.7-jdk21 AS build
WORKDIR /app

# 의존성 캐시를 위해 빌드 파일만 먼저 복사
COPY build.gradle settings.gradle ./
COPY gradle ./gradle
COPY gradlew ./

# 의존성 다운로드
RUN gradle dependencies

# 전체 소스코드 복사
COPY . .

# 애플리케이션 빌드 (테스트는 제외)
RUN gradle clean build -x test

# ---

# 2. Runtime Stage (실행용 환경) - JRE 21 (Alpine) 사용
# (가장 가벼운 JRE 이미지로 최종 수정)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# 8080 포트 개방 (Spring Boot 기본 포트)
EXPOSE 8080

# 빌드 스테이지(build)에서 생성된 .jar 파일을 app.jar로 복사
COPY --from=build /app/build/libs/*.jar app.jar

# 컨테이너 시작 명령어
ENTRYPOINT ["java", "-jar", "app.jar"]