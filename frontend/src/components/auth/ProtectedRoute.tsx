import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const isLoading = useAppSelector(state => state.auth.isLoading);
  const location = useLocation();

  // 세션 복구(refreshSession)가 끝나기 전에는 판단을 보류한다.
  // 이 대기가 없으면 새로고침 시 복구 완료 전에 /login 으로 튕긴다.
  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;