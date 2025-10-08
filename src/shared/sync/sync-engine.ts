/* eslint-disable no-console */
import { BaseRepository } from '../db/storage/base.repository'
import { LocalContentRepository } from '../db/storage/content.repository'
import { LocalGraphRepository } from '../db/storage/graph.repository'
import { LocalTagRepository } from '../db/storage/tag.repository'

class SyncRepository extends BaseRepository {
  // Public wrapper methods for protected BaseRepository methods
  async getUnsyncedOperations(userId: string) {
    return super.getUnsyncedOperations(userId)
  }

  async markOperationSynced(operationId: string) {
    return super.markOperationSynced(operationId)
  }

  async getSyncMetadata(entityType: string, entityId: string) {
    return super.getSyncMetadata(entityType, entityId)
  }

  async updateSyncMetadata(metadata: any) {
    return super.updateSyncMetadata(metadata)
  }
}

interface SyncConflict {
  entityType: string
  entityId: string
  localVersion: number
  serverVersion: number
  localData: any
  serverData: any
}

interface SyncResult {
  success: boolean
  conflicts: SyncConflict[]
  synced: number
  failed: number
}

export class SyncEngine {
  private syncRepo = new SyncRepository()
  private contentRepo = new LocalContentRepository()
  private tagRepo = new LocalTagRepository()
  private graphRepo = new LocalGraphRepository()

  private syncInProgress = false
  private syncInterval: ReturnType<typeof setInterval> | null = null
  private userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  async startAutoSync(intervalMs: number = 5000): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }

    this.syncInterval = setInterval(() => {
      this.sync().catch((error) => {
        console.error('[Sync] Auto sync failed:', error)
      })
    }, intervalMs)

    // Initial sync
    await this.sync()
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  async sync(): Promise<SyncResult> {
    if (this.syncInProgress) {
      console.log('[Sync] Sync already in progress, skipping')
      return { success: false, conflicts: [], synced: 0, failed: 0 }
    }

    this.syncInProgress = true
    let retryCount = 0
    const maxRetries = 3

    try {
      console.log('[Sync] Starting sync...')

      try {
        const { createBackup } = await import('../db/backup')
        await createBackup()
        console.log('[Sync] Created backup before sync')
      }
      catch (backupError) {
        console.warn('[Sync] Failed to create backup:', backupError)
      }

      const attemptSync = async (): Promise<SyncResult> => {
        try {
          const pushResult = await this.pushLocalChanges()
          const pullResult = await this.pullServerChanges()

          return {
            success: true,
            conflicts: [...pushResult.conflicts, ...pullResult.conflicts],
            synced: pushResult.synced + pullResult.synced,
            failed: pushResult.failed + pullResult.failed,
          }
        }
        catch (error) {
          if (retryCount < maxRetries && (error instanceof TypeError || (error as any).message?.includes('network'))) {
            retryCount++
            console.warn(`[Sync] Network error, retrying (${retryCount}/${maxRetries})...`)
            await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** retryCount))
            return attemptSync()
          }
          throw error
        }
      }

      const result = await attemptSync()
      console.log('[Sync] Completed:', result)
      return result
    }
    catch (error) {
      console.error('[Sync] Failed:', error)
      return { success: false, conflicts: [], synced: 0, failed: 1 }
    }
    finally {
      this.syncInProgress = false
    }
  }

  private async pushLocalChanges(): Promise<SyncResult> {
    const operations = await this.syncRepo.getUnsyncedOperations(this.userId)

    if (!operations.length) {
      return { success: true, conflicts: [], synced: 0, failed: 0 }
    }

    console.log(`[Sync] Pushing ${operations.length} local changes`)

    try {
      const response = await fetch('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ operations }),
      })

      if (!response.ok) {
        throw new Error(`Push failed: ${response.statusText}`)
      }

      const result = await response.json()

      for (const op of operations) {
        if (!result.conflicts?.find((c: any) => c.entityId === op.entity_id)) {
          await this.syncRepo.markOperationSynced(op.id)
        }
      }

      const conflicts: SyncConflict[] = result.conflicts || []
      await this.resolveConflicts(conflicts)

      return {
        success: true,
        conflicts,
        synced: operations.length - conflicts.length,
        failed: conflicts.length,
      }
    }
    catch (error) {
      console.error('[Sync] Push failed:', error)
      return {
        success: false,
        conflicts: [],
        synced: 0,
        failed: operations.length,
      }
    }
  }

  private async pullServerChanges(): Promise<SyncResult> {
    try {
      const response = await fetch('/api/sync/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: this.userId }),
      })

      if (!response.ok) {
        throw new Error(`Pull failed: ${response.statusText}`)
      }

      const { changes } = await response.json()

      if (!changes?.length) {
        return { success: true, conflicts: [], synced: 0, failed: 0 }
      }

      console.log(`[Sync] Pulling ${changes.length} server changes`)

      let synced = 0
      let failed = 0

      for (const change of changes) {
        try {
          await this.applyServerChange(change)
          synced++
        }
        catch (error) {
          console.error('[Sync] Failed to apply server change:', error)
          failed++
        }
      }

      return { success: true, conflicts: [], synced, failed }
    }
    catch (error) {
      console.error('[Sync] Pull failed:', error)
      return { success: false, conflicts: [], synced: 0, failed: 0 }
    }
  }

  private async applyServerChange(change: any): Promise<void> {
    const { entity_type, entity_id, operation, data, version, timestamp } = change

    const metadata = await this.syncRepo.getSyncMetadata(entity_type, entity_id)

    if (metadata && metadata.server_version && metadata.server_version >= version) {
      console.log(`[Sync] Skipping ${entity_type}:${entity_id} - already have version ${version}`)
      return
    }

    switch (entity_type) {
      case 'content':
        if (operation === 'create' || operation === 'update') {
          const existing = await this.contentRepo.getById(entity_id, this.userId)
          if (existing) {
            await this.contentRepo.update(entity_id, data, this.userId)
          }
          else {
            await this.contentRepo.create({ ...data, id: entity_id }, this.userId)
          }
        }
        else if (operation === 'delete') {
          await this.contentRepo.delete(entity_id, this.userId)
        }
        break

      case 'tag':
        if (operation === 'create') {
          await this.tagRepo.create({ ...data, id: entity_id }, this.userId)
        }
        else if (operation === 'delete') {
          await this.tagRepo.delete(entity_id, this.userId)
        }
        break

      case 'content_tag':
        if (operation === 'create') {
          const [contentId, tagId] = entity_id.split(':')
          await this.tagRepo.addContentTag(contentId, tagId, this.userId)
        }
        else if (operation === 'delete') {
          const [contentId, tagId] = entity_id.split(':')
          await this.tagRepo.removeContentTag(contentId, tagId, this.userId)
        }
        break

      case 'node':
        if (operation === 'create' || operation === 'update') {
          const existing = await this.graphRepo.getNodeById(entity_id, this.userId)
          if (existing) {
            await this.graphRepo.updateNode(entity_id, data, this.userId)
          }
          else {
            await this.graphRepo.createNode({ ...data, id: entity_id }, this.userId)
          }
        }
        else if (operation === 'delete') {
          await this.graphRepo.deleteNode(entity_id, this.userId)
        }
        break

      case 'edge':
        if (operation === 'create') {
          await this.graphRepo.createEdge({ ...data, id: entity_id }, this.userId)
        }
        else if (operation === 'delete') {
          await this.graphRepo.deleteEdge(entity_id, this.userId)
        }
        break
    }

    await this.syncRepo.updateSyncMetadata({
      entity_type,
      entity_id,
      version,
      server_version: version,
      last_modified: timestamp,
      sync_status: 'synced',
      tombstone: operation === 'delete',
    })
  }

  private async resolveConflicts(conflicts: SyncConflict[]): Promise<void> {
    for (const conflict of conflicts) {
      console.log(`[Sync] Resolving conflict for ${conflict.entityType}:${conflict.entityId}`)

      const localMetadata = await this.syncRepo.getSyncMetadata(
        conflict.entityType,
        conflict.entityId,
      )

      if (!localMetadata) {
        await this.applyServerChange({
          entity_type: conflict.entityType,
          entity_id: conflict.entityId,
          operation: 'update',
          data: conflict.serverData,
          version: conflict.serverVersion,
          timestamp: Date.now(),
        })
        continue
      }

      if (conflict.serverVersion > localMetadata.version) {
        console.log('[Sync] Server wins (newer version)')
        await this.applyServerChange({
          entity_type: conflict.entityType,
          entity_id: conflict.entityId,
          operation: 'update',
          data: conflict.serverData,
          version: conflict.serverVersion,
          timestamp: Date.now(),
        })
      }
      else {
        console.log('[Sync] Local wins (newer version)')
      }
    }
  }

  async getUnsyncedOperations() {
    return await this.syncRepo.getUnsyncedOperations(this.userId)
  }

  async initialSync(): Promise<void> {
    console.log('[Sync] Starting initial sync - pulling all data from server')

    try {
      const response = await fetch('/api/sync/initial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: this.userId }),
      })

      if (!response.ok) {
        throw new Error(`Initial sync failed: ${response.statusText}`)
      }

      const { data } = await response.json()

      console.log('[Sync] Populating local DB with server data')

      if (data.content) {
        for (const item of data.content) {
          await this.contentRepo.create(item, this.userId)
        }
      }

      if (data.tags) {
        for (const tag of data.tags) {
          await this.tagRepo.create(tag, this.userId)
        }
      }

      if (data.content_tags) {
        for (const ct of data.content_tags) {
          await this.tagRepo.addContentTag(ct.content_id, ct.tag_id, this.userId)
        }
      }

      if (data.nodes) {
        for (const node of data.nodes) {
          await this.graphRepo.createNode(node, this.userId)
        }
      }

      if (data.edges) {
        for (const edge of data.edges) {
          await this.graphRepo.createEdge(edge, this.userId)
        }
      }

      console.log('[Sync] Initial sync completed')
    }
    catch (error) {
      console.error('[Sync] Initial sync failed:', error)
      throw error
    }
  }
}
