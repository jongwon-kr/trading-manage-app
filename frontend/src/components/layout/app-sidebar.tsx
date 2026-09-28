import { useState, useEffect } from 'react'; 
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem 
} from "@/components/ui/sidebar"
import { 
  TrendingUp, 
  Settings, 
  LogOut,
  RefreshCw, 
  Timer, 
} from "lucide-react"
import { NavLink } from "react-router-dom"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useAppDispatch, useAppSelector } from "@/store/hooks" 
import { logoutUser, refreshSession } from "@/store/slices/authSlice" 
import { cn } from "@/utils/shadcn-util"
import { NAV_ITEMS } from "./nav-items"

/**
 * AccessToken 만료 타이머 및 갱신 버튼 컴포넌트
 */
const TokenExpiryTimer = () => {
  const dispatch = useAppDispatch();
  const { accessTokenExpiresAt, isAuthenticated } = useAppSelector((state) => state.auth);
  const [timeLeft, setTimeLeft] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !accessTokenExpiresAt) {
      setTimeLeft("");
      return;
    }

    const calculateTimeLeft = () => {
      const now = Date.now();
      const remaining = accessTokenExpiresAt - now;

      if (remaining <= 0) {
        setTimeLeft("만료됨");
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [accessTokenExpiresAt, isAuthenticated]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await dispatch(refreshSession());
    setIsRefreshing(false);
  };

  if (!timeLeft) return null;

  const isExpired = timeLeft === "만료됨";

  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50">
      <div className="flex items-center gap-2">
        <Timer className={`h-4 w-4 ${isExpired ? 'text-red-500' : 'text-muted-foreground'}`} />
        <div className="text-xs">
          <p className="text-muted-foreground">세션 만료까지</p>
          <p className={`font-medium ${isExpired ? 'text-red-500' : 'text-foreground'}`}>
            {timeLeft}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={handleRefresh}
        disabled={isRefreshing}
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
};


export function AppSidebar() {
  const dispatch = useAppDispatch() 
  const user = useAppSelector((state) => state.auth.user); 

  const handleLogout = () => {
    dispatch(logoutUser()); 
  }

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <TrendingUp className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Trading Manager</h2>
            <p className="text-xs text-muted-foreground">투자 분석 플랫폼</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-4 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) => cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground w-full text-left",
                        isActive && "bg-accent text-accent-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="border-t p-4 space-y-3">
        <TokenExpiryTimer />
      
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/placeholder-avatar.jpg" />
            <AvatarFallback>{user?.username.substring(0, 2).toUpperCase() || 'TM'}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium">{user?.username || 'Trader'}</p>
            <p className="text-xs text-muted-foreground">{user?.email || 'trader@example.com'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="flex-1">
            <Settings className="h-4 w-4 mr-2" />
            설정
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}> 
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}