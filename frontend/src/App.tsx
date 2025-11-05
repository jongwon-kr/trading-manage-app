// src/App.tsx
import { useState } from 'react'
import { MainLayout } from './components/layout/main-layout'
import { Dashboard } from './pages/Dashboard'
import './index.css'

type ActivePage = 'dashboard' | 'analysis' | 'journal' | 'performance'

function App() {
  const [activePage, setActivePage] = useState<ActivePage>('dashboard')

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />
      case 'analysis':
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">사전 분석 페이지</h3>
              <p className="text-muted-foreground">곧 구현 예정입니다.</p>
            </div>
          </div>
        )
      case 'journal':
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">매매 일지 페이지</h3>
              <p className="text-muted-foreground">곧 구현 예정입니다.</p>
            </div>
          </div>
        )
      case 'performance':
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">성과 분석 페이지</h3>
              <p className="text-muted-foreground">곧 구현 예정입니다.</p>
            </div>
          </div>
        )
      default:
        return <Dashboard />
    }
  }

  const getPageTitle = () => {
    switch (activePage) {
      case 'dashboard':
        return 'Trading Dashboard'
      case 'analysis':
        return '사전 분석'
      case 'journal':
        return '매매 일지'
      case 'performance':
        return '성과 분석'
      default:
        return 'Trading Dashboard'
    }
  }

  return (
    <MainLayout 
      title={getPageTitle()}
      subtitle={activePage === 'dashboard' ? '실시간 포트폴리오 모니터링' : undefined}
    >
      {renderPage()}
    </MainLayout>
  )
}

export default App
