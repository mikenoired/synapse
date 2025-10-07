import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createContext } from '@/server/context'
import ContentRepository from '@/server/repositories/content.repository'

export async function POST(req: NextRequest) {
  try {
    const ctx = await createContext({ req })

    if (!ctx.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { operations } = await req.json()

    if (!Array.isArray(operations)) {
      return NextResponse.json({ error: 'Invalid operations' }, { status: 400 })
    }

    const repo = new ContentRepository(ctx)
    const conflicts: any[] = []

    for (const op of operations) {
      try {
        const { entity_type, entity_id, operation, data, version } = op

        let serverVersion = 0
        let existing: any = null
        if (entity_type === 'content') {
          existing = await repo.getById(entity_id)
          if (existing) {
            serverVersion = 1
          }
        }

        if (serverVersion > version) {
          conflicts.push({
            entityType: entity_type,
            entityId: entity_id,
            localVersion: version,
            serverVersion,
            localData: data,
            serverData: existing,
          })
          continue
        }

        if (entity_type === 'content') {
          const parsedData = typeof data === 'string' ? JSON.parse(data) : data
          if (operation === 'create') {
            await repo.create({ ...parsedData, tag_ids: parsedData.tag_ids || [] })
          }
          else if (operation === 'update') {
            await repo.updateContent({ id: entity_id, ...parsedData })
          }
          else if (operation === 'delete') {
            await repo.deleteContent(entity_id)
          }
        }
        else if (entity_type === 'tag') {
          const parsedData = typeof data === 'string' ? JSON.parse(data) : data

          if (operation === 'create') {
            console.error('[Sync] Tag create operation not implemented:', parsedData)
          }
          else if (operation === 'delete') {
            console.error('[Sync] Tag delete operation not implemented:', entity_id)
          }
        }
        else if (entity_type === 'node') {
          const parsedData = typeof data === 'string' ? JSON.parse(data) : data

          if (operation === 'create') {
            console.error('[Sync] Node create operation not implemented:', parsedData)
          }
          else if (operation === 'delete') {
            console.error('[Sync] Node delete operation not implemented:', entity_id)
          }
        }
        else if (entity_type === 'content_tag') {
          const parsedData = typeof data === 'string' ? JSON.parse(data) : data

          if (operation === 'create') {
            console.error('[Sync] Content-tag create operation not implemented:', parsedData)
          }
          else if (operation === 'delete') {
            console.error('[Sync] Content-tag delete operation not implemented:', entity_id)
          }
        }
      }
      catch (error) {
        console.error('[Sync] Failed to apply operation:', error)
      }
    }

    return NextResponse.json({
      success: true,
      conflicts,
      synced: operations.length - conflicts.length,
    })
  }
  catch (error) {
    console.error('[Sync] Push failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
