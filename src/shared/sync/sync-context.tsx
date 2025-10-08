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

    // Запускаем регулярное создание резервных копий
    import('../db/backup').then(({ scheduleBackups, createBackup }) => {
      // Создаем начальную резервную копию
      createBackup()
      // Планируем регулярное создание копий каждые 5 минут
      const stopBackups = scheduleBackups(5 * 60 * 1000)

      // Очистка при размонтировании
      return () => stopBackups()
    })

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

      // Обработка ошибок синхронизации
      workerClient.on('SYNC_ERROR', (error) => {
        console.error('[Sync] Sync error:', error)
        setSyncError(error.message || 'Ошибка синхронизации')

        // Автоматическая попытка восстановления при сетевых ошибках
        if (error.isNetworkError) {
          setTimeout(() => {
            console.log('[Sync] Attempting to recover from network error...')
            workerClient.syncNow()
          }, 10000) // Повторная попытка через 10 секунд
        }
      })

      // Обработка ошибок авторизации
      workerClient.on('AUTH_ERROR', (error) => {
        console.error('[Sync] Auth error:', error)
        setSyncError(error.message || 'Требуется повторная авторизация')
        // Здесь можно добавить логику для перенаправления на страницу логина
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
    setSyncError(null)
    try {
      const result = await syncEngine.sync()
      setLastSyncTime(Date.now())

      if (!result.success) {
        setSyncError(`Sync failed: ${result.failed} operations failed`)
      }

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
