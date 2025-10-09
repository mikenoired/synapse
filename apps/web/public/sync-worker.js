const ports = new Set()
let syncInterval = null
let userId = null

globalThis.addEventListener('connect', (e) => {
  const port = e.ports[0]
  ports.add(port)

  globalThis.console.log('[SyncWorker] New tab connected, total tabs:', ports.size)

  port.addEventListener('message', async (event) => {
    const { type, payload } = event.data

    switch (type) {
      case 'INIT':
        userId = payload.userId
        startSync()
        port.postMessage({ type: 'INIT_SUCCESS' })
        break

      case 'SYNC_NOW':
        await performSync()
        break

      case 'BROADCAST':
        broadcastToOthers(port, payload)
        break

      case 'STOP':
        stopSync()
        break

      default:
        console.warn('[SyncWorker] Unknown message type:', type)
    }
  })

  port.start()

  port.addEventListener('close', () => {
    ports.delete(port)
    globalThis.console.log('[SyncWorker] Tab disconnected, remaining tabs:', ports.size)

    if (ports.size === 0) {
      stopSync()
    }
  })
})

function startSync() {
  if (syncInterval)
    return

  globalThis.console.log('[SyncWorker] Starting auto-sync')

  syncInterval = setInterval(async () => {
    await performSync()
  }, 5000)

  performSync()
}

function stopSync() {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
    globalThis.console.log('[SyncWorker] Stopped auto-sync')
  }
}

async function performSync() {
  if (!userId)
    return

  try {
    const response = await fetch('/api/sync/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ userId }),
    })

    if (response.ok) {
      const { changes } = await response.json()

      if (changes && changes.length > 0) {
        broadcastToAll({
          type: 'SYNC_UPDATE',
          changes,
        })
      }
    }
    else {
      const errorText = await response.text()
      globalThis.console.error(`[SyncWorker] Sync HTTP error: ${response.status} ${response.statusText}`, errorText)

      broadcastToAll({
        type: 'SYNC_ERROR',
        error: {
          status: response.status,
          statusText: response.statusText,
          message: `Sync error: ${response.status} ${response.statusText}`,
        },
      })

      if (response.status === 401 || response.status === 403) {
        broadcastToAll({
          type: 'AUTH_ERROR',
          error: {
            message: 'Authentication required',
          },
        })
      }
    }
  }
  catch (error) {
    globalThis.console.error('[SyncWorker] Sync failed:', error)

    broadcastToAll({
      type: 'SYNC_ERROR',
      error: {
        message: `Network error during sync: ${error.message || 'Unknown error'}`,
        isNetworkError: true,
      },
    })
  }
}

function broadcastToAll(message) {
  for (const port of ports) {
    try {
      port.postMessage(message)
    }
    catch (error) {
      console.error('[SyncWorker] Failed to broadcast to port:', error)
    }
  }
}

function broadcastToOthers(senderPort, message) {
  for (const port of ports) {
    if (port !== senderPort) {
      try {
        port.postMessage(message)
      }
      catch (error) {
        console.error('[SyncWorker] Failed to broadcast to port:', error)
      }
    }
  }
}
