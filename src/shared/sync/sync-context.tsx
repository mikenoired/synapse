'use client'

/* eslint-disable no-console */
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useState } from 'react'
import { useLocalDB } from '../db/hooks/use-local-db'
import { useAuth } from '../lib/auth-context'
import { getSharedWorkerClient } from './shared-worker-client'
import { SyncEngine } from './sync-engine'

interface SyncContextType {
  isSyncing: boolean
  lastSyncTime: number | null
  syncNow: () => Promise<void>
  syncEngine: SyncEngine | null
}

const SyncContext = createContext<SyncContextType>({
  isSyncing: false,
  lastSyncTime: null,
  syncNow: async () => { },
  syncEngine: null,
})

export function useSyncContext() {
  return useContext(SyncContext)
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { isInitialized } = useLocalDB()
  const queryClient = useQueryClient()

  const [syncEngine, setSyncEngine] = useState<SyncEngine | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null)

  useEffect(() => {
    if (!user || !isInitialized) {
      if (syncEngine) {
        syncEngine.stopAutoSync()
        setSyncEngine(null)
      }
      return
    }

    const engine = new SyncEngine(user.id)
    setSyncEngine(engine)

    // Initialize shared worker for cross-tab sync
    const workerClient = getSharedWorkerClient()

    workerClient.init(user.id).then(() => {
      console.log('[Sync] Shared worker initialized')

      // Listen for sync updates from other tabs
      workerClient.on('SYNC_UPDATE', (changes) => {
        console.log('[Sync] Received updates from other tab:', changes)
        // Invalidate queries to refetch from local DB
        queryClient.invalidateQueries({ queryKey: ['local-content'] })
        queryClient.invalidateQueries({ queryKey: ['local-tags'] })
        queryClient.invalidateQueries({ queryKey: ['local-graph'] })
      })
    }).catch((error) => {
      console.warn('[Sync] Shared worker initialization failed:', error)
      // Fallback to regular auto-sync without shared worker
      engine.startAutoSync(5000).catch((err) => {
        console.error('[Sync] Failed to start auto sync:', err)
      })
    })

    // Perform initial sync
    engine.initialSync().catch((error) => {
      console.error('[Sync] Initial sync failed:', error)
    })

    return () => {
      engine.stopAutoSync()
      workerClient.close()
    }
  }, [user, isInitialized, queryClient])

  const syncNow = async () => {
    if (!syncEngine || isSyncing)
      return

    setIsSyncing(true)
    try {
      await syncEngine.sync()
      setLastSyncTime(Date.now())

      // Notify other tabs
      const workerClient = getSharedWorkerClient()
      workerClient.broadcast({ type: 'SYNC_COMPLETED' })

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['local-content'] })
      queryClient.invalidateQueries({ queryKey: ['local-tags'] })
      queryClient.invalidateQueries({ queryKey: ['local-graph'] })
    }
    catch (error) {
      console.error('[Sync] Manual sync failed:', error)
    }
    finally {
      setIsSyncing(false)
    }
  }

  return (
    <SyncContext.Provider value={{ isSyncing, lastSyncTime, syncNow, syncEngine }}>
      {children}
    </SyncContext.Provider>
  )
}
