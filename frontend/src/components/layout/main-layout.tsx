// src/components/layout/main-layout.tsx
import { useEffect, useState } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { AppSidebar } from "./app-sidebar"
import { Bell, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { headerTitleFor } from "./nav-items"
import { ThemeToggle } from "./ThemeToggle"
import { SymbolSearchDialog } from "@/components/market/SymbolSearchDialog"

export function MainLayout() {
  const { pathname } = useLocation()
  const { title, subtitle } = headerTitleFor(pathname)
  const [searchOpen, setSearchOpen] = useState(false)

  // Ctrl/⌘ + K 로 종목 검색
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setSearchOpen((v) => !v)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-6">
            <div className="flex items-center gap-2 min-w-0">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <div className="min-w-0">
                <h1 className="text-lg font-semibold truncate">{title}</h1>
                {subtitle && (
                  <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2 text-muted-foreground" onClick={() => setSearchOpen(true)}>
                <Search className="h-4 w-4" />
                <span className="hidden md:inline">종목 검색</span>
                <kbd className="hidden md:inline rounded border bg-muted px-1.5 text-[10px]">Ctrl K</kbd>
              </Button>
              <ThemeToggle />
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              </Button>
            </div>
          </header>

          <div className="flex-1 p-6 overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>
      <SymbolSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </SidebarProvider>
  )
}
