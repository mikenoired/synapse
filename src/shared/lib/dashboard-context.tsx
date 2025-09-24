'use client'

import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'

interface DashboardContextType {
  isAddDialogOpen: boolean
  setAddDialogOpen: Dispatch<SetStateAction<boolean>>
  triggerSearchFocus: () => void
  setTriggerSearchFocus: (callback: () => void) => void
  preloadedFiles: File[]
  setPreloadedFiles: Dispatch<SetStateAction<File[]>>
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [isAddDialogOpen, setAddDialogOpen] = useState(false)
  const [searchFocus, setSearchFocus] = useState<() => void>(() => () => { })
  const [preloadedFiles, setPreloadedFiles] = useState<File[]>([])

  const setTriggerSearchFocus = useCallback((callback: () => void) => {
    setSearchFocus(() => callback)
  }, [])

  const value = useMemo(() => ({
    isAddDialogOpen,
    setAddDialogOpen,
    triggerSearchFocus: searchFocus,
    setTriggerSearchFocus,
    preloadedFiles,
    setPreloadedFiles,
  }), [isAddDialogOpen, searchFocus, setTriggerSearchFocus, preloadedFiles])

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
}
