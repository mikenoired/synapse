import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { verifyToken } from '@/server/lib/jwt'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const token = authHeader.replace('Bearer ', '')
  const payload = verifyToken(token)
  if (!payload)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // TODO: Replace with real stats
  return NextResponse.json({ tokensUsed: 12000, quota: 20000 })
}
