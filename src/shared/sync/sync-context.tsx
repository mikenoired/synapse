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
  syncError: string | null
  pendingOperations: number
  getPendingOperations: () => Promise<number>
}

const SyncContext = createContext<SyncContextType>({
  isSyncing: false,
  lastSyncTime: null,
  syncNow: async () => { },
  syncEngine: null,
  syncError: null,
  pendingOperations: 0,
  getPendingOperations: async () => 0,
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
  const [syncError, setSyncError] = useState<string | null>(null)
  const [pendingOperations, setPendingOperations] = useState(0)

  useEffect(() => {
    if (!user || !isInitialized) {
      if (syncEngine) {
        syncEngine.stopAutoSync()
        setSyncEngine(null)
      }
      return
    }

    import('../db/backup').then(({ scheduleBackups, createBackup }) => {
      createBackup()
      const stopBackups = scheduleBackups(5 * 60 * 1000)
      return () => stopBackups()
    })

    const engine = new SyncEngine(user.id)
    setSyncEngine(engine)

    const workerClient = getSharedWorkerClient()

    workerClient.init(user.id).then(() => {
      console.log('[Sync] Shared worker initialized')

      workerClient.on('SYNC_UPDATE', (changes) => {
        console.log('[Sync] Received updates from other tab:', changes)
        queryClient.invalidateQueries({ queryKey: ['local-content'] })
        queryClient.invalidateQueries({ queryKey: ['local-tags'] })
        queryClient.invalidateQueries({ queryKey: ['local-graph'] })
      })

      workerClient.on('SYNC_ERROR', (error) => {
        console.error('[Sync] Sync error:', error)
        setSyncError(error.message || 'Sync error')

        if (error.isNetworkError) {
          setTimeout(() => {
            console.log('[Sync] Attempting to recover from network error...')
            workerClient.syncNow()
          }, 10000)
        }
      })

      workerClient.on('AUTH_ERROR', (error) => {
        console.error('[Sync] Auth error:', error)
        setSyncError(error.message || '')
      })
    }).catch((error) => {
      console.warn('[Sync] Shared worker initialization failed:', error)
      engine.startAutoSync(5000).catch((err) => {
        console.error('[Sync] Failed to start auto sync:', err)
      })
    })

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
    setSyncError(null)
    try {
      const result = await syncEngine.sync()
      setLastSyncTime(Date.now())

      if (!result.success) {
        setSyncError(`Sync failed: ${result.failed} operations failed`)
      }

      const workerClient = getSharedWorkerClient()
      workerClient.broadcast({ type: 'SYNC_COMPLETED' })

      queryClient.invalidateQueries({ queryKey: ['local-content'] })
      queryClient.invalidateQueries({ queryKey: ['local-tags'] })
      queryClient.invalidateQueries({ queryKey: ['local-graph'] })
    }
    catch (error) {
      console.error('[Sync] Manual sync failed:', error)
      setSyncError(error instanceof Error ? error.message : 'Unknown sync error')
    }
    finally {
      setIsSyncing(false)
    }
  }

  const getPendingOperations = async () => {
    if (!syncEngine)
      return 0
    try {
      const operations = await syncEngine.getUnsyncedOperations()
      setPendingOperations(operations.length)
      return operations.length
    }
    catch (error) {
      console.error('[Sync] Failed to get pending operations:', error)
      return 0
    }
  }

  return (
    <SyncContext.Provider value={{
      isSyncing,
      lastSyncTime,
      syncNow,
      syncEngine,
      syncError,
      pendingOperations,
      getPendingOperations,
    }}
    >
      {children}
    </SyncContext.Provider>
  )
}
