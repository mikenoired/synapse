'use client'

import { Button } from '@synapse/ui/components'
import { useSyncContext } from '@/shared/sync/sync-context'
import { LoadingSpinner } from '@/shared/ui/loading-spinner'

export function SyncStatus() {
  const {
    isSyncing,
    lastSyncTime,
    syncNow,
    syncError,
    pendingOperations,
  } = useSyncContext()

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString()
  }

  const getStatusColor = () => {
    if (syncError)
      return 'bg-red-500'
    if (pendingOperations > 0)
      return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStatusText = () => {
    if (isSyncing)
      return 'Syncing...'
    if (syncError)
      return 'Sync Error'
    if (pendingOperations > 0)
      return `${pendingOperations} pending`
    return 'Synced'
  }

  return (
    <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        {isSyncing
          ? (
              <>
                <LoadingSpinner />
                <span>Syncing...</span>
              </>
            )
          : (
              <>
                <div className={`size-2 rounded-full ${getStatusColor()}`} />
                <span>{getStatusText()}</span>
              </>
            )}
      </div>

      {lastSyncTime && !isSyncing && (
        <span className="text-muted-foreground">
          {formatTime(lastSyncTime)}
        </span>
      )}

      {syncError && (
        <span className="text-red-500 text-xs">
          {syncError}
        </span>
      )}

      <Button
        onClick={syncNow}
        disabled={isSyncing}
        variant="outline"
        size="sm"
      >
        Sync Now
      </Button>
    </div>
  )
}
