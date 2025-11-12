/// <reference types="vite/client" />

declare module '*.css' {
  const content: string;
  export default content;
}

declare module '*.scss' {
  const content: string;
  export default content;
}

// 환경 변수 타입 정의
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  // 다른 env 변수들도 여기에 추가
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}