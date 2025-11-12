import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import store from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { refreshSession, logoutUser } from "@/store/slices/authSlice";
import { MainLayout } from "@/components/layout/main-layout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const Login = React.lazy(() => import("@/pages/auth/Login"));
const Register = React.lazy(() => import("@/pages/auth/Register"));

const Dashboard = React.lazy(() =>
  import("@/pages/Dashboard").then((module) => ({
    default: module.Dashboard,
  }))
);
const Journal = React.lazy(() =>
  import("@/pages/Journal").then((module) => ({
    default: module.Journal,
  }))
);
const Analysis = React.lazy(() =>
  import("@/pages/Analysis").then((module) => ({ default: module.Analysis }))
);
const Performance = React.lazy(() =>
  import("@/pages/Performance").then((module) => ({
    default: module.Performance,
  }))
);

const AppContent = () => {
  const dispatch = useAppDispatch();
  const activePage = useAppSelector((state) => state.page.activePage);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  useEffect(() => {
    dispatch(refreshSession());
  }, [dispatch]);

  const pageTitles: { [key in string]: { title: string; subtitle?: string } } =
    {
      dashboard: { title: "대시보드", subtitle: "포트폴리오 현황 요약" },
      analysis: {
        title: "사전 분석",
        subtitle: "실시간 시장 분석 및 스크리닝",
      },
      journal: { title: "매매 일지", subtitle: "거래 기록 및 성과 분석" },
      performance: {
        title: "성과 분석",
        subtitle: "포트폴리오 성과 및 위험 분석",
      },
    };

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <Dashboard />;
      case "analysis":
        return <Analysis />;
      case "journal":
        return <Journal />;
      case "performance":
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
        path="/*"
        element={
          <ProtectedRoute>
            <MainLayout
              title={pageTitles[activePage]?.title || "대시보드"}
              subtitle={pageTitles[activePage]?.subtitle}
            >
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
        <React.Suspense
          fallback={
            <div className="flex h-screen w-full items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          }
        >
          <AppContent />
          <Toaster />
        </React.Suspense>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
