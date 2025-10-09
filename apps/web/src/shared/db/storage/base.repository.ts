import type { SQLiteDB } from '../client'
import { getDB } from '../client'

export interface SyncMetadata {
  entity_type: string
  entity_id: string
  version: number
  server_version?: number
  last_modified: number
  sync_status: 'synced' | 'pending' | 'conflict'
  tombstone: boolean
}

export interface Operation {
  id: string
  entity_type: string
  entity_id: string
  operation: 'create' | 'update' | 'delete'
  data?: string
  version: number
  timestamp: number
  synced: boolean
  user_id: string
}

export abstract class BaseRepository {
  protected db: SQLiteDB | null = null

  protected async getDb(): Promise<SQLiteDB> {
    if (!this.db) {
      this.db = await getDB()
    }
    return this.db
  }

  protected async getSyncMetadata(entityType: string, entityId: string): Promise<SyncMetadata | null> {
    const db = await this.getDb()
    const rows = db.selectObjects(
      `SELECT * FROM sync_metadata WHERE entity_type = ? AND entity_id = ?`,
      [entityType, entityId],
    )

    if (!rows.length)
      return null

    const row = rows[0]
    return {
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      version: row.version,
      server_version: row.server_version,
      last_modified: row.last_modified,
      sync_status: row.sync_status,
      tombstone: Boolean(row.tombstone),
    }
  }

  protected async updateSyncMetadata(metadata: SyncMetadata): Promise<void> {
    const db = await this.getDb()
    db.run(
      `INSERT INTO sync_metadata (entity_type, entity_id, version, server_version, last_modified, sync_status, tombstone)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(entity_type, entity_id) DO UPDATE SET
         version = excluded.version,
         server_version = excluded.server_version,
         last_modified = excluded.last_modified,
         sync_status = excluded.sync_status,
         tombstone = excluded.tombstone`,
      [
        metadata.entity_type,
        metadata.entity_id,
        metadata.version,
        metadata.server_version ?? null,
        metadata.last_modified,
        metadata.sync_status,
        metadata.tombstone ? 1 : 0,
      ],
    )
  }

  protected async logOperation(operation: Omit<Operation, 'id'>): Promise<void> {
    const db = await this.getDb()
    const id = crypto.randomUUID()

    db.run(
      `INSERT INTO operations (id, entity_type, entity_id, operation, data, version, timestamp, synced, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        operation.entity_type,
        operation.entity_id,
        operation.operation,
        operation.data ?? null,
        operation.version,
        operation.timestamp,
        operation.synced ? 1 : 0,
        operation.user_id,
      ],
    )
  }

  protected async getNextVersion(entityType: string, entityId: string): Promise<number> {
    const metadata = await this.getSyncMetadata(entityType, entityId)
    return (metadata?.version ?? 0) + 1
  }

  protected async markOperationSynced(operationId: string): Promise<void> {
    const db = await this.getDb()
    db.run(`UPDATE operations SET synced = 1 WHERE id = ?`, [operationId])
  }

  protected async getUnsyncedOperations(userId: string): Promise<Operation[]> {
    const db = await this.getDb()
    const rows = db.selectObjects(
      `SELECT * FROM operations WHERE synced = 0 AND user_id = ? ORDER BY timestamp ASC`,
      [userId],
    )

    return rows.map(row => ({
      id: row.id,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      operation: row.operation,
      data: row.data,
      version: row.version,
      timestamp: row.timestamp,
      synced: Boolean(row.synced),
      user_id: row.user_id,
    }))
  }
}
