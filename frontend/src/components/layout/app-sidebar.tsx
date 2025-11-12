// src/components/layout/app-sidebar.tsx
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
  Eye, 
  BookOpen, 
  BarChart3, 
  Settings, 
  LogOut,
  Home
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useAppDispatch, useAppSelector } from "@/store/hooks" // ✅ Redux hooks
import { setActivePage, ActivePage } from "@/store/slices/pageSlice" // ✅ Redux action
import { cn } from "@/utils/shadcn-util"

const menuItems = [
  {
    title: "대시보드",
    page: "dashboard" as ActivePage,
    icon: Home,
  },
  {
    title: "사전 분석",
    page: "analysis" as ActivePage,
    icon: Eye,
  },
  {
    title: "매매 일지",
    page: "journal" as ActivePage,
    icon: BookOpen,
  },
  {
    title: "성과 분석", 
    page: "performance" as ActivePage,
    icon: BarChart3,
  },
]

export function AppSidebar() {
  const dispatch = useAppDispatch() // ✅ Redux dispatch
  const activePage = useAppSelector((state) => state.page.activePage) // ✅ Redux selector

  const handlePageChange = (page: ActivePage) => {
    dispatch(setActivePage(page)) // ✅ Redux action 디스패치
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
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <button 
                      onClick={() => handlePageChange(item.page)} // ✅ Redux 액션 호출
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground w-full text-left",
                        activePage === item.page && "bg-accent text-accent-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="border-t p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/placeholder-avatar.jpg" />
            <AvatarFallback>TM</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium">Trader</p>
            <p className="text-xs text-muted-foreground">trader@example.com</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="flex-1">
            <Settings className="h-4 w-4 mr-2" />
            설정
          </Button>
          <Button variant="ghost" size="sm">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
