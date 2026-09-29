import React, { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import store from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { refreshSession } from "@/store/slices/authSlice";
import { MainLayout } from "@/components/layout/main-layout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Toaster } from "@/components/ui/sonner";

const Login = React.lazy(() => import("@/pages/auth/Login"));
const Register = React.lazy(() => import("@/pages/auth/Register"));

const named = <T extends string>(loader: () => Promise<Record<T, React.ComponentType>>, name: T) =>
  React.lazy(() => loader().then((m) => ({ default: m[name] })));

const Dashboard = named(() => import("@/pages/Dashboard"), "Dashboard");
const MarketOverview = named(() => import("@/pages/MarketOverview"), "MarketOverview");
const Trends = named(() => import("@/pages/Trends"), "Trends");
const Community = named(() => import("@/pages/Community"), "Community");
const CommunityPost = named(() => import("@/pages/CommunityPost"), "CommunityPost");
const CommunityWrite = named(() => import("@/pages/CommunityWrite"), "CommunityWrite");
const UserProfile = named(() => import("@/pages/UserProfile"), "UserProfile");
const AdminReports = named(() => import("@/pages/AdminReports"), "AdminReports");
const SymbolDetail = named(() => import("@/pages/SymbolDetail"), "SymbolDetail");
const Analysis = named(() => import("@/pages/Analysis"), "Analysis");
const Methodology = named(() => import("@/pages/Methodology"), "Methodology");
const StrategyList = named(() => import("@/pages/StrategyList"), "StrategyList");
const StrategyEditor = named(() => import("@/pages/StrategyEditor"), "StrategyEditor");
const Backtest = named(() => import("@/pages/Backtest"), "Backtest");
const Watchlist = named(() => import("@/pages/Watchlist"), "Watchlist");
const Journal = named(() => import("@/pages/Journal"), "Journal");
const Performance = named(() => import("@/pages/Performance"), "Performance");
const NotFound = named(() => import("@/pages/NotFound"), "NotFound");

const AppContent = () => {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector((state) => state.auth.isLoading);

  useEffect(() => {
    if (isLoading) {
      dispatch(refreshSession());
    }
  }, [dispatch, isLoading]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="market" element={<MarketOverview />} />
        <Route path="market/:market/:symbol" element={<SymbolDetail />} />
        <Route path="trends" element={<Trends />} />
        <Route path="watchlist" element={<Watchlist />} />
        <Route path="analysis" element={<Analysis />} />
        <Route path="analysis/methodology" element={<Methodology />} />
        <Route path="strategies" element={<StrategyList />} />
        <Route path="strategies/:id" element={<StrategyEditor />} />
        <Route path="backtest" element={<Backtest />} />
        <Route path="journal" element={<Journal />} />
        <Route path="performance" element={<Performance />} />
        <Route path="community" element={<Community />} />
        <Route path="community/write" element={<CommunityWrite />} />
        <Route path="community/:id" element={<CommunityPost />} />
        <Route path="users/:username" element={<UserProfile />} />
        <Route path="admin/reports" element={<AdminReports />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

const PageFallback = (
  <div className="flex h-screen w-full items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <React.Suspense fallback={PageFallback}>
          <AppContent />
          <Toaster />
        </React.Suspense>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
