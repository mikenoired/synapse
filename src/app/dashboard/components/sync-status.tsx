'use client'

import { useSyncContext } from '@/shared/sync/sync-context'
import { Button } from '@/shared/ui/button'
import { LoadingSpinner } from '@/shared/ui/loading-spinner'

export function SyncStatus() {
  const { isSyncing, lastSyncTime, syncNow } = useSyncContext()

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString()
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
                <div className="size-2 rounded-full bg-green-500" />
                <span>Synced</span>
              </>
            )}
      </div>

      {lastSyncTime && (
        <span className="text-muted-foreground">
          {formatTime(lastSyncTime)}
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
