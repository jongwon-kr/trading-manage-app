import { matchPath } from "react-router-dom";
import { BarChart3, BookOpen, FlaskConical, Home, LineChart, SlidersHorizontal, Star, Target, TrendingUp, type LucideIcon } from "lucide-react";

export interface NavItem {
  path: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
}

// 사이드바 메뉴 (순서 = 표시 순서)
export const NAV_ITEMS: NavItem[] = [
  { path: "/dashboard", title: "대시보드", subtitle: "시장 요약과 포트폴리오 현황", icon: Home },
  { path: "/market", title: "시장", subtitle: "국내·미국 주식과 암호화폐 시세", icon: LineChart },
  { path: "/trends", title: "시장 동향", subtitle: "브리핑·섹터 로테이션·주도 업종/테마", icon: TrendingUp },
  { path: "/watchlist", title: "관심종목", subtitle: "관심종목 실시간 시세", icon: Star },
  { path: "/analysis", title: "전략 분석", subtitle: "기본적·기술적·시장국면 정량 분석", icon: Target },
  { path: "/strategies", title: "내 전략", subtitle: "분석 방법(가중치·밴드·기간) 만들기", icon: SlidersHorizontal },
  { path: "/backtest", title: "백테스트", subtitle: "점수 기반 전략의 과거 성과 검증", icon: FlaskConical },
  { path: "/journal", title: "매매 일지", subtitle: "거래 기록 및 성과 분석", icon: BookOpen },
  { path: "/performance", title: "성과 분석", subtitle: "포트폴리오 성과 및 위험 분석", icon: BarChart3 },
];

// 메뉴에 없는 하위 경로의 헤더 제목
const EXTRA_TITLES: { pattern: string; title: string; subtitle?: string }[] = [
  { pattern: "/market/:market/:symbol", title: "종목 상세", subtitle: "차트·시세·재무 지표" },
  { pattern: "/analysis/methodology", title: "분석 방법", subtitle: "전략 점수 모델의 지표·밴드·가중치" },
  { pattern: "/strategies/:id", title: "전략 편집", subtitle: "팩터·가중치·밴드·신호를 바꾸고 기본 모델과 비교" },
];

export function headerTitleFor(pathname: string): { title: string; subtitle?: string } {
  const extra = EXTRA_TITLES.find((e) => matchPath(e.pattern, pathname));
  if (extra) return extra;
  const item = NAV_ITEMS.find((n) => matchPath({ path: n.path, end: false }, pathname));
  return item ?? { title: "Trading Manager" };
}
