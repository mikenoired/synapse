import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createSupabaseClient } from '@/shared/api/supabase-client'

const COOKIE_NAME = 'synapse_token'

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    const supabase = createSupabaseClient(token)
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const cookieStore = await cookies()
    cookieStore.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      // Set short TTL; Supabase access tokens are short-lived, cookie mirrors it
      // Max-Age ~ 1 hour
      maxAge: 60 * 60,
      path: '/',
    })

    return NextResponse.json({ success: true })
  }
  catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.set({ name: COOKIE_NAME, value: '', maxAge: 0, path: '/' })
  return NextResponse.json({ success: true })
}
