import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createSupabaseClient } from '@/shared/api/supabase-client'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const token = authHeader.replace('Bearer ', '')
  const supabase = createSupabaseClient(token)
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // TODO: Replace with real settings
  return NextResponse.json({ palette: 'default', font: 'Inter' })
}
