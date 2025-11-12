import { Navigate } from 'react-router-dom';
// --- 경로 수정 ---
import { useAppSelector } from '@/hooks/reduxHooks';
// --- 경로 수정 ---

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export default ProtectedRoute;