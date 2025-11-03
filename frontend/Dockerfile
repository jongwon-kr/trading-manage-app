# 1. Build Stage (빌드용 환경) - Node.js 20 LTS 사용
FROM node:20-alpine AS BUILD
WORKDIR /app

# 의존성 설치 (빌드 캐시 활용)
COPY package.json package-lock.json ./
RUN npm install

# 2. 소스코드 복사 및 빌드
COPY . .
# "tsc -b && vite build" 스크립트 실행
RUN npm run build

# ---

# 2. Serve Stage (서빙용 환경) - Nginx 사용
FROM nginx:1.25-alpine

# React Vite의 기본 빌드 출력 폴더는 'dist' 입니다.
# 빌드 스테이지에서 생성된 'dist' 폴더를 Nginx의 웹 루트로 복사
COPY --from=BUILD /app/dist /usr/share/nginx/html

# 80번 포트 개방
EXPOSE 80
# Nginx 서버 실행
CMD ["nginx", "-g", "daemon off;"]