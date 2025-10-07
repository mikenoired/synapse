import { BaseRepository } from './base.repository'

interface NodeRow {
  id: string
  type: string
  content?: string
  metadata?: string
  user_id: string
}

interface EdgeRow {
  id: string
  from_node: string
  to_node: string
  relation_type: string
  user_id: string
}

export class LocalGraphRepository extends BaseRepository {
  // Nodes
  async getAllNodes(userId: string): Promise<NodeRow[]> {
    const db = await this.getDb()
    return db.selectObjects(
      `SELECT * FROM nodes WHERE user_id = ?`,
      [userId],
    )
  }

  async getNodeById(id: string, userId: string): Promise<NodeRow | null> {
    const db = await this.getDb()
    const rows = db.selectObjects(
      `SELECT * FROM nodes WHERE id = ? AND user_id = ?`,
      [id, userId],
    )
    return rows[0] || null
  }

  async getNodeByContentId(contentId: string, userId: string): Promise<NodeRow | null> {
    const db = await this.getDb()
    const rows = db.selectObjects(
      `SELECT * FROM nodes 
       WHERE type = 'content' 
       AND json_extract(metadata, '$.content_id') = ?
       AND user_id = ?
       LIMIT 1`,
      [contentId, userId],
    )
    return rows[0] || null
  }

  async createNode(data: NodeRow, userId: string): Promise<NodeRow> {
    const db = await this.getDb()
    const now = Date.now()
    const version = await this.getNextVersion('node', data.id)

    db.transaction(() => {
      db.run(
        `INSERT INTO nodes (id, type, content, metadata, user_id)
         VALUES (?, ?, ?, ?, ?)`,
        [data.id, data.type, data.content ?? null, data.metadata ?? null, data.user_id],
      )

      this.updateSyncMetadata({
        entity_type: 'node',
        entity_id: data.id,
        version,
        last_modified: now,
        sync_status: 'pending',
        tombstone: false,
      })

      this.logOperation({
        entity_type: 'node',
        entity_id: data.id,
        operation: 'create',
        data: JSON.stringify(data),
        version,
        timestamp: now,
        synced: false,
        user_id: userId,
      })
    })

    return data
  }

  async updateNode(id: string, data: Partial<Omit<NodeRow, 'id' | 'user_id'>>, userId: string): Promise<void> {
    const db = await this.getDb()
    const now = Date.now()
    const version = await this.getNextVersion('node', id)

    const updates: string[] = []
    const params: any[] = []

    if (data.type !== undefined) {
      updates.push('type = ?')
      params.push(data.type)
    }
    if (data.content !== undefined) {
      updates.push('content = ?')
      params.push(data.content)
    }
    if (data.metadata !== undefined) {
      updates.push('metadata = ?')
      params.push(data.metadata)
    }

    if (!updates.length)
      return

    params.push(id, userId)

    db.transaction(() => {
      db.run(
        `UPDATE nodes SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
        params,
      )

      this.updateSyncMetadata({
        entity_type: 'node',
        entity_id: id,
        version,
        last_modified: now,
        sync_status: 'pending',
        tombstone: false,
      })

      this.logOperation({
        entity_type: 'node',
        entity_id: id,
        operation: 'update',
        data: JSON.stringify(data),
        version,
        timestamp: now,
        synced: false,
        user_id: userId,
      })
    })
  }

  async deleteNode(id: string, userId: string): Promise<void> {
    const db = await this.getDb()
    const now = Date.now()
    const version = await this.getNextVersion('node', id)

    db.transaction(() => {
      this.updateSyncMetadata({
        entity_type: 'node',
        entity_id: id,
        version,
        last_modified: now,
        sync_status: 'pending',
        tombstone: true,
      })

      this.logOperation({
        entity_type: 'node',
        entity_id: id,
        operation: 'delete',
        version,
        timestamp: now,
        synced: false,
        user_id: userId,
      })

      db.run(`DELETE FROM nodes WHERE id = ? AND user_id = ?`, [id, userId])
    })
  }

  // Edges
  async getAllEdges(userId: string): Promise<EdgeRow[]> {
    const db = await this.getDb()
    return db.selectObjects(
      `SELECT * FROM edges WHERE user_id = ?`,
      [userId],
    )
  }

  async getEdgesByNode(nodeId: string, userId: string): Promise<EdgeRow[]> {
    const db = await this.getDb()
    return db.selectObjects(
      `SELECT * FROM edges WHERE (from_node = ? OR to_node = ?) AND user_id = ?`,
      [nodeId, nodeId, userId],
    )
  }

  async createEdge(data: EdgeRow, userId: string): Promise<EdgeRow> {
    const db = await this.getDb()
    const now = Date.now()
    const version = await this.getNextVersion('edge', data.id)

    db.transaction(() => {
      db.run(
        `INSERT INTO edges (id, from_node, to_node, relation_type, user_id)
         VALUES (?, ?, ?, ?, ?)`,
        [data.id, data.from_node, data.to_node, data.relation_type, data.user_id],
      )

      this.updateSyncMetadata({
        entity_type: 'edge',
        entity_id: data.id,
        version,
        last_modified: now,
        sync_status: 'pending',
        tombstone: false,
      })

      this.logOperation({
        entity_type: 'edge',
        entity_id: data.id,
        operation: 'create',
        data: JSON.stringify(data),
        version,
        timestamp: now,
        synced: false,
        user_id: userId,
      })
    })

    return data
  }

  async deleteEdge(id: string, userId: string): Promise<void> {
    const db = await this.getDb()
    const now = Date.now()
    const version = await this.getNextVersion('edge', id)

    db.transaction(() => {
      this.updateSyncMetadata({
        entity_type: 'edge',
        entity_id: id,
        version,
        last_modified: now,
        sync_status: 'pending',
        tombstone: true,
      })

      this.logOperation({
        entity_type: 'edge',
        entity_id: id,
        operation: 'delete',
        version,
        timestamp: now,
        synced: false,
        user_id: userId,
      })

      db.run(`DELETE FROM edges WHERE id = ? AND user_id = ?`, [id, userId])
    })
  }

  async deleteEdgesByContentNode(contentNodeId: string, userId: string): Promise<void> {
    const db = await this.getDb()
    const edges = await this.getEdgesByNode(contentNodeId, userId)

    db.transaction(() => {
      for (const edge of edges) {
        this.deleteEdge(edge.id, userId)
      }
    })
  }
}
