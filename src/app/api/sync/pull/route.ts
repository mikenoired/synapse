import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createContext } from '@/server/context'
// import ContentRepository from '@/server/repositories/content.repository'

export async function POST(req: NextRequest) {
  try {
    const ctx = await createContext({ req })

    if (!ctx.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // const { lastSyncTimestamp } = await req.json()

    // const repo = new ContentRepository(ctx)

    // Get all changes since last sync
    // For now, just return empty - will implement proper change tracking later
    const changes: any[] = []

    return NextResponse.json({ changes })
  }
  catch (error) {
    console.error('[Sync] Pull failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
