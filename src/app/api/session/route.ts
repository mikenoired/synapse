import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { verifyRefreshToken, verifyToken } from '@/server/lib/jwt'

const ACCESS_TOKEN_COOKIE = 'synapse_token'
const REFRESH_TOKEN_COOKIE = 'synapse_refresh_token'

export async function POST(req: NextRequest) {
  try {
    const { token, refreshToken } = await req.json()

    if (!token || typeof token !== 'string') {
      console.error('[Session API] Token is missing or invalid')
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      console.error('[Session API] Token verification failed')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const cookieStore = await cookies()

    cookieStore.set({
      name: ACCESS_TOKEN_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    })

    if (refreshToken && typeof refreshToken === 'string') {
      const refreshPayload = verifyRefreshToken(refreshToken)
      if (refreshPayload) {
        cookieStore.set({
          name: REFRESH_TOKEN_COOKIE,
          value: refreshToken,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
        })
      }
      else {
        console.warn('[Session API] Refresh token verification failed')
      }
    }

    return NextResponse.json({
      success: true,
      user: { id: payload.userId, email: payload.email },
    })
  }
  catch (error) {
    console.error('[Session API] Error:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies()
    cookieStore.set({ name: ACCESS_TOKEN_COOKIE, value: '', maxAge: 0, path: '/' })
    cookieStore.set({ name: REFRESH_TOKEN_COOKIE, value: '', maxAge: 0, path: '/' })
    return NextResponse.json({ success: true })
  }
  catch (error) {
    console.error('[Session API] Error clearing cookies:', error)
    return NextResponse.json({ error: 'Failed to clear session' }, { status: 500 })
  }
}
