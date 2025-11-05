// src/App.tsx (수정)
import { Provider } from 'react-redux'
import { store } from './store'
import { MainLayout } from './components/layout/main-layout'
import { Dashboard } from './pages/Dashboard'
import { Analysis } from './pages/Analysis'
import { Journal } from './pages/Journal'
import { Performance } from './pages/Performance' // ✅ 추가
import { useAppSelector } from './store/hooks'
import './index.css'

function AppContent() {
  const activePage = useAppSelector((state) => state.page.activePage)

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />
      case 'analysis':
        return <Analysis />
      case 'journal':
        return <Journal />
      case 'performance':
        return <Performance /> // ✅ 수정
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
        return '성과 분석' // ✅ 수정
      default:
        return 'Trading Dashboard'
    }
  }

  const getPageSubtitle = () => {
    switch (activePage) {
      case 'dashboard':
        return '실시간 포트폴리오 모니터링'
      case 'analysis':
        return '시장 분석 및 종목 스크리닝'
      case 'journal':
        return '거래 기록과 성과 분석'
      case 'performance':
        return '포트폴리오 성과 및 위험 분석' // ✅ 추가
      default:
        return undefined
    }
  }

  return (
    <MainLayout 
      title={getPageTitle()}
      subtitle={getPageSubtitle()}
    >
      {renderPage()}
    </MainLayout>
  )
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  )
}

export default App
