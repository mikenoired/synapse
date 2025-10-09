export class SharedWorkerClient {
  private worker: SharedWorker | null = null
  private port: MessagePort | null = null
  private messageHandlers = new Map<string, (payload: any) => void>()

  constructor() {
    if (typeof window === 'undefined') {
      console.warn('[SharedWorker] Not available in SSR')
      return
    }

    if (!('SharedWorker' in window)) {
      console.warn('[SharedWorker] Not supported in this browser')
      return
    }

    try {
      this.worker = new SharedWorker('/sync-worker.js', {
        name: 'sync-worker',
      })

      this.port = this.worker.port
      this.port.start()

      this.port.addEventListener('message', (event) => {
        const { type, payload } = event.data
        const handler = this.messageHandlers.get(type)

        if (handler) {
          handler(payload)
        }
      })

      // eslint-disable-next-line no-console
      console.log('[SharedWorker] Client initialized')
    }
    catch (error) {
      console.error('[SharedWorker] Initialization failed:', error)
    }
  }

  init(userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.port) {
        reject(new Error('SharedWorker not available'))
        return
      }

      const timeout = setTimeout(() => {
        reject(new Error('SharedWorker init timeout'))
      }, 5000)

      this.on('INIT_SUCCESS', () => {
        clearTimeout(timeout)
        resolve()
      })

      this.send('INIT', { userId })
    })
  }

  send(type: string, payload?: any): void {
    if (!this.port) {
      console.warn('[SharedWorker] Port not available')
      return
    }

    this.port.postMessage({ type, payload })
  }

  on(type: string, handler: (payload: any) => void): void {
    this.messageHandlers.set(type, handler)
  }

  off(type: string): void {
    this.messageHandlers.delete(type)
  }

  syncNow(): void {
    this.send('SYNC_NOW')
  }

  broadcast(payload: any): void {
    this.send('BROADCAST', payload)
  }

  close(): void {
    if (this.port) {
      this.send('STOP')
      this.port.close()
      this.port = null
    }

    this.worker = null
    this.messageHandlers.clear()
  }
}

// Singleton instance
let sharedWorkerClient: SharedWorkerClient | null = null

export function getSharedWorkerClient(): SharedWorkerClient {
  if (!sharedWorkerClient) {
    sharedWorkerClient = new SharedWorkerClient()
  }
  return sharedWorkerClient
}
