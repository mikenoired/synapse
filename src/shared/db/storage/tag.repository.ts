import { BaseRepository } from './base.repository'

interface TagRow {
  id: string
  title: string
  user_id: string
}

export class LocalTagRepository extends BaseRepository {
  async getAll(userId: string): Promise<TagRow[]> {
    const db = await this.getDb()
    return db.selectObjects(
      `SELECT * FROM tags WHERE user_id = ? ORDER BY title ASC`,
      [userId],
    )
  }

  async getById(id: string, userId: string): Promise<TagRow | null> {
    const db = await this.getDb()
    const rows = db.selectObjects(
      `SELECT * FROM tags WHERE id = ? AND user_id = ?`,
      [id, userId],
    )
    return rows[0] || null
  }

  async getByIds(ids: string[], userId: string): Promise<TagRow[]> {
    if (!ids.length)
      return []

    const db = await this.getDb()
    const placeholders = ids.map(() => '?').join(',')
    return db.selectObjects(
      `SELECT * FROM tags WHERE id IN (${placeholders}) AND user_id = ?`,
      [...ids, userId],
    )
  }

  async getByTitle(title: string, userId: string): Promise<TagRow | null> {
    const db = await this.getDb()
    const rows = db.selectObjects(
      `SELECT * FROM tags WHERE title = ? AND user_id = ? LIMIT 1`,
      [title, userId],
    )
    return rows[0] || null
  }

  async create(data: TagRow, userId: string): Promise<TagRow> {
    const db = await this.getDb()
    const now = Date.now()
    const version = await this.getNextVersion('tag', data.id)

    db.transaction(() => {
      db.run(
        `INSERT INTO tags (id, title, user_id) VALUES (?, ?, ?)`,
        [data.id, data.title, data.user_id],
      )

      this.updateSyncMetadata({
        entity_type: 'tag',
        entity_id: data.id,
        version,
        last_modified: now,
        sync_status: 'pending',
        tombstone: false,
      })

      this.logOperation({
        entity_type: 'tag',
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

  async delete(id: string, userId: string): Promise<void> {
    const db = await this.getDb()
    const now = Date.now()
    const version = await this.getNextVersion('tag', id)

    db.transaction(() => {
      this.updateSyncMetadata({
        entity_type: 'tag',
        entity_id: id,
        version,
        last_modified: now,
        sync_status: 'pending',
        tombstone: true,
      })

      this.logOperation({
        entity_type: 'tag',
        entity_id: id,
        operation: 'delete',
        version,
        timestamp: now,
        synced: false,
        user_id: userId,
      })

      db.run(`DELETE FROM tags WHERE id = ? AND user_id = ?`, [id, userId])
    })
  }

  async addContentTag(contentId: string, tagId: string, userId: string): Promise<void> {
    const db = await this.getDb()
    const now = Date.now()
    const entityId = `${contentId}:${tagId}`
    const version = await this.getNextVersion('content_tag', entityId)

    db.transaction(() => {
      db.run(
        `INSERT OR IGNORE INTO content_tags (content_id, tag_id, user_id) VALUES (?, ?, ?)`,
        [contentId, tagId, userId],
      )

      this.updateSyncMetadata({
        entity_type: 'content_tag',
        entity_id: entityId,
        version,
        last_modified: now,
        sync_status: 'pending',
        tombstone: false,
      })

      this.logOperation({
        entity_type: 'content_tag',
        entity_id: entityId,
        operation: 'create',
        data: JSON.stringify({ content_id: contentId, tag_id: tagId }),
        version,
        timestamp: now,
        synced: false,
        user_id: userId,
      })
    })
  }

  async removeContentTag(contentId: string, tagId: string, userId: string): Promise<void> {
    const db = await this.getDb()
    const now = Date.now()
    const entityId = `${contentId}:${tagId}`
    const version = await this.getNextVersion('content_tag', entityId)

    db.transaction(() => {
      this.updateSyncMetadata({
        entity_type: 'content_tag',
        entity_id: entityId,
        version,
        last_modified: now,
        sync_status: 'pending',
        tombstone: true,
      })

      this.logOperation({
        entity_type: 'content_tag',
        entity_id: entityId,
        operation: 'delete',
        version,
        timestamp: now,
        synced: false,
        user_id: userId,
      })

      db.run(
        `DELETE FROM content_tags WHERE content_id = ? AND tag_id = ? AND user_id = ?`,
        [contentId, tagId, userId],
      )
    })
  }

  async replaceContentTags(contentId: string, tagIds: string[], userId: string): Promise<void> {
    const db = await this.getDb()

    db.transaction(() => {
      // Get current tags
      const currentTags = db.selectObjects(
        `SELECT tag_id FROM content_tags WHERE content_id = ? AND user_id = ?`,
        [contentId, userId],
      )
      const currentTagIds = new Set(currentTags.map(t => t.tag_id))
      const newTagIds = new Set(tagIds)

      // Remove tags that are no longer present
      for (const tagId of currentTagIds) {
        if (!newTagIds.has(tagId)) {
          this.removeContentTag(contentId, tagId, userId)
        }
      }

      // Add new tags
      for (const tagId of newTagIds) {
        if (!currentTagIds.has(tagId)) {
          this.addContentTag(contentId, tagId, userId)
        }
      }
    })
  }
}
