import { BaseRepository } from './base.repository'

interface ContentRow {
  id: string
  type: string
  content: string
  title?: string
  thumbnail_base64?: string
  created_at: number
  updated_at: number
  user_id: string
}

export class LocalContentRepository extends BaseRepository {
  async getAll(
    userId: string,
    search?: string,
    type?: string,
    cursor?: string,
    limit: number = 12,
  ): Promise<ContentRow[]> {
    const db = await this.getDb()

    let sql = `
      SELECT c.* FROM content c
      LEFT JOIN sync_metadata sm ON sm.entity_type = 'content' AND sm.entity_id = c.id
      WHERE c.user_id = ? AND (sm.tombstone IS NULL OR sm.tombstone = 0)
    `
    const params: any[] = [userId]

    if (search) {
      sql += ` AND c.id IN (SELECT content_id FROM content_fts WHERE content_fts MATCH ?)`
      params.push(search)
    }

    if (type) {
      sql += ` AND c.type = ?`
      params.push(type)
    }

    if (cursor) {
      const [timestamp, id] = cursor.split('|')
      sql += ` AND (c.created_at < ? OR (c.created_at = ? AND c.id < ?))`
      params.push(Number(timestamp), Number(timestamp), id)
    }

    sql += ` ORDER BY c.created_at DESC, c.id DESC LIMIT ?`
    params.push(limit)

    return db.selectObjects(sql, params)
  }

  async getById(id: string, userId: string): Promise<ContentRow | null> {
    const db = await this.getDb()
    const rows = db.selectObjects(
      `SELECT * FROM content WHERE id = ? AND user_id = ?`,
      [id, userId],
    )
    return rows[0] || null
  }

  async getByTagIds(
    userId: string,
    tagIds: string[],
    search?: string,
    type?: string,
    limit: number = 20,
  ): Promise<ContentRow[]> {
    const db = await this.getDb()

    let sql = `
      SELECT DISTINCT c.* FROM content c
      INNER JOIN content_tags ct ON ct.content_id = c.id
      LEFT JOIN sync_metadata sm ON sm.entity_type = 'content' AND sm.entity_id = c.id
      WHERE c.user_id = ? AND ct.tag_id IN (${tagIds.map(() => '?').join(',')})
      AND (sm.tombstone IS NULL OR sm.tombstone = 0)
    `
    const params: any[] = [userId, ...tagIds]

    if (search) {
      sql += ` AND c.id IN (SELECT content_id FROM content_fts WHERE content_fts MATCH ?)`
      params.push(search)
    }

    if (type) {
      sql += ` AND c.type = ?`
      params.push(type)
    }

    sql += ` ORDER BY c.created_at DESC LIMIT ?`
    params.push(limit)

    return db.selectObjects(sql, params)
  }

  async create(data: Omit<ContentRow, 'created_at' | 'updated_at'>, userId: string): Promise<ContentRow> {
    const db = await this.getDb()
    const now = Date.now()
    const version = await this.getNextVersion('content', data.id)

    db.transaction(() => {
      db.run(
        `INSERT INTO content (id, type, content, title, thumbnail_base64, created_at, updated_at, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.id, data.type, data.content, data.title ?? null, data.thumbnail_base64 ?? null, now, now, data.user_id],
      )

      this.updateSyncMetadata({
        entity_type: 'content',
        entity_id: data.id,
        version,
        last_modified: now,
        sync_status: 'pending',
        tombstone: false,
      })

      this.logOperation({
        entity_type: 'content',
        entity_id: data.id,
        operation: 'create',
        data: JSON.stringify(data),
        version,
        timestamp: now,
        synced: false,
        user_id: userId,
      })
    })

    return { ...data, created_at: now, updated_at: now }
  }

  async update(id: string, data: Partial<Omit<ContentRow, 'id' | 'user_id'>>, userId: string): Promise<void> {
    const db = await this.getDb()
    const now = Date.now()
    const version = await this.getNextVersion('content', id)

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
    if (data.title !== undefined) {
      updates.push('title = ?')
      params.push(data.title)
    }
    if (data.thumbnail_base64 !== undefined) {
      updates.push('thumbnail_base64 = ?')
      params.push(data.thumbnail_base64)
    }

    updates.push('updated_at = ?')
    params.push(now)

    params.push(id, userId)

    db.transaction(() => {
      db.run(
        `UPDATE content SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
        params,
      )

      this.updateSyncMetadata({
        entity_type: 'content',
        entity_id: id,
        version,
        last_modified: now,
        sync_status: 'pending',
        tombstone: false,
      })

      this.logOperation({
        entity_type: 'content',
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

  async delete(id: string, userId: string): Promise<void> {
    const db = await this.getDb()
    const now = Date.now()
    const version = await this.getNextVersion('content', id)

    db.transaction(() => {
      // Soft delete - mark as tombstone instead of actually deleting
      this.updateSyncMetadata({
        entity_type: 'content',
        entity_id: id,
        version,
        last_modified: now,
        sync_status: 'pending',
        tombstone: true,
      })

      this.logOperation({
        entity_type: 'content',
        entity_id: id,
        operation: 'delete',
        version,
        timestamp: now,
        synced: false,
        user_id: userId,
      })

      // Actually delete from content table after logging
      db.run(`DELETE FROM content WHERE id = ? AND user_id = ?`, [id, userId])
    })
  }

  async getContentTags(contentIds: string[]): Promise<Array<{ content_id: string, tag_id: string, tag_title: string }>> {
    if (!contentIds.length)
      return []

    const db = await this.getDb()
    const placeholders = contentIds.map(() => '?').join(',')

    return db.selectObjects(
      `SELECT ct.content_id, ct.tag_id, t.title as tag_title
       FROM content_tags ct
       INNER JOIN tags t ON t.id = ct.tag_id
       WHERE ct.content_id IN (${placeholders})`,
      contentIds,
    )
  }
}
