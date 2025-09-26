'use client'

import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AddContentDialog } from '@/features/add-content/ui/add-content-dialog'

interface AddDialogOpenOptions {
  initialTags?: string[]
  onContentAdded?: () => void
}

interface AddDialogConfig {
  initialTags: string[]
  onContentAdded?: () => void
}

interface AddDialogDefaults {
  initialTags?: string[]
  onContentAdded?: (() => void) | null
}

interface DashboardContextType {
  isAddDialogOpen: boolean
  openAddDialog: (options?: AddDialogOpenOptions) => void
  closeAddDialog: () => void
  setAddDialogDefaults: (defaults: AddDialogDefaults) => void
  dialogOptions: AddDialogConfig
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
  const [dialogDefaults, setDialogDefaultsState] = useState<AddDialogConfig>({ initialTags: [] })
  const [dialogOptions, setDialogOptions] = useState<AddDialogConfig>({ initialTags: [] })

  const setTriggerSearchFocus = useCallback((callback: () => void) => {
    setSearchFocus(() => callback)
  }, [])

  const normalizeTags = useCallback((tags?: string[]) => {
    if (!tags?.length)
      return []
    return Array.from(new Set(tags.filter(Boolean)))
  }, [])

  const openAddDialog = useCallback((options?: AddDialogOpenOptions) => {
    setDialogOptions({
      initialTags: normalizeTags(options?.initialTags ?? dialogDefaults.initialTags),
      onContentAdded: options?.onContentAdded ?? dialogDefaults.onContentAdded,
    })
    setAddDialogOpen(true)
  }, [dialogDefaults, normalizeTags])

  const closeAddDialog = useCallback(() => {
    setAddDialogOpen(false)
    setDialogOptions({
      initialTags: dialogDefaults.initialTags,
      onContentAdded: dialogDefaults.onContentAdded,
    })
  }, [dialogDefaults])

  const setAddDialogDefaults = useCallback((defaults: AddDialogDefaults) => {
    setDialogDefaultsState(prev => ({
      initialTags: defaults.initialTags !== undefined ? normalizeTags(defaults.initialTags) : prev.initialTags,
      onContentAdded: defaults.onContentAdded !== undefined ? defaults.onContentAdded ?? undefined : prev.onContentAdded,
    }))
  }, [normalizeTags])

  const value = useMemo(() => ({
    isAddDialogOpen,
    openAddDialog,
    closeAddDialog,
    setAddDialogDefaults,
    dialogOptions,
    triggerSearchFocus: searchFocus,
    setTriggerSearchFocus,
    preloadedFiles,
    setPreloadedFiles,
  }), [isAddDialogOpen, searchFocus, setTriggerSearchFocus, preloadedFiles, openAddDialog, closeAddDialog, setAddDialogDefaults, dialogOptions])

  return (
    <DashboardContext.Provider value={value}>
      {children}
      {isAddDialogOpen && <AddContentDialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen} initialTags={dialogOptions.initialTags} onContentAdded={dialogOptions.onContentAdded} />}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
}
