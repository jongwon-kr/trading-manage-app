import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
// --- 경로 수정 ---
import store from '@/store';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { initializeAuth, logoutUser } from '@/store/slices/authSlice';
import { MainLayout } from '@/components/layout/main-layout'; // MainLayout으로 변경
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Toaster } from "@/components/ui/sonner" // Toaster 추가 (알림)
import { Button } from "@/components/ui/button" // Button 추가 (로그아웃)
import { LogOut } from 'lucide-react'; // 아이콘 추가
// --- 경로 수정 ---

// --- 레이지 로딩 경로 수정 ---
const Login = React.lazy(() => import('@/pages/auth/Login'));
const Register = React.lazy(() => import('@/pages/auth/Register'));

const Dashboard = React.lazy(() =>
  import('@/pages/Dashboard').then((module) => ({
    default: module.Dashboard,
  })),
);
const Journal = React.lazy(() => // Journal 페이지 추가
  import('@/pages/Journal').then((module) => ({
    default: module.Journal,
  })),
);
const Analysis = React.lazy(() =>
  import('@/pages/Analysis').then((module) => ({ default: module.Analysis })),
);
const Performance = React.lazy(() => // Performance 페이지 추가
  import('@/pages/Performance').then((module) => ({
    default: module.Performance,
  })),
);
// --- 레이지 로딩 경로 수정 ---


// --- AppContent: Redux 상태에 접근하기 위해 분리 ---
const AppContent = () => {
  const dispatch = useAppDispatch();
  const activePage = useAppSelector((state) => state.page.activePage);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  useEffect(() => {
    // 앱 시작 시 로컬 스토리지에서 인증 상태 복원
    dispatch(initializeAuth());
  }, [dispatch]);

  // 페이지 타이틀 매핑
  const pageTitles: { [key in string]: { title: string; subtitle?: string } } = {
    dashboard: { title: '대시보드', subtitle: '포트폴리오 현황 요약' },
    analysis: { title: '사전 분석', subtitle: '실시간 시장 분석 및 스크리닝' },
    journal: { title: '매매 일지', subtitle: '거래 기록 및 성과 분석' },
    performance: { title: '성과 분석', subtitle: '포트폴리오 성과 및 위험 분석' },
  };

  // 현재 페이지에 맞는 컴포넌트 렌더링
  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'analysis':
        return <Analysis />;
      case 'journal':
        return <Journal />;
      case 'performance':
        return <Performance />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/*" // 모든 보호된 경로는 MainLayout을 사용
        element={
          <ProtectedRoute>
            <MainLayout
              title={pageTitles[activePage]?.title || '대시보드'}
              subtitle={pageTitles[activePage]?.subtitle}
            >
              {/* 로그아웃 버튼을 MainLayout 내부에 배치 (예시) */}
              {isAuthenticated && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-4 right-6"
                  onClick={() => dispatch(logoutUser())}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  로그아웃
                </Button>
              )}
              {renderPage()}
            </MainLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <React.Suspense fallback={
          <div className="flex h-screen w-full items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        }>
          <AppContent />
          <Toaster /> {/* 알림 컴포넌트 추가 */}
        </React.Suspense>
      </BrowserRouter>
    </Provider>
  );
}

export default App;