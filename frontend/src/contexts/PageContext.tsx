import React, { createContext, useContext, useState } from 'react'

type ActivePage = 'dashboard' | 'analysis' | 'journal' | 'performance'

interface PageContextType {
  activePage: ActivePage
  setActivePage: (page: ActivePage) => void
}

const PageContext = createContext<PageContextType | undefined>(undefined)

export function PageProvider({ children }: { children: React.ReactNode }) {
  const [activePage, setActivePage] = useState<ActivePage>('dashboard')

  return (
    <PageContext.Provider value={{ activePage, setActivePage }}>
      {children}
    </PageContext.Provider>
  )
}

export function usePage() {
  const context = useContext(PageContext)
  if (context === undefined) {
    throw new Error('usePage must be used within a PageProvider')
  }
  return context
}
