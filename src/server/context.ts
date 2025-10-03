import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { db } from './db'
import { verifyToken } from './lib/jwt'
import { CacheRepository } from './repositories/cache.repository'

export async function createContext({ req }: { req?: NextRequest }) {
  const headerToken = req?.headers.get('authorization')?.replace('Bearer ', '')
  const cookieStore = await cookies().catch(() => undefined)
  const cookieToken = cookieStore?.get('synapse_token')?.value
  const refreshToken = cookieStore?.get('synapse_refresh_token')?.value
  const token = headerToken || cookieToken

  let user = null
  if (token) {
    try {
      const payload = verifyToken(token)
      if (payload) {
        user = {
          id: payload.userId,
          email: payload.email,
        }
      }
    }
    catch (error) {
      console.error('Ошибка проверки токена:', error)
    }
  }

  return {
    cache: new CacheRepository(),
    db,
    req,
    user,
    token,
    refreshToken,
    requestId: req?.headers.get('x-request-id') || crypto.randomUUID?.() || undefined,
    ip: req?.headers.get('x-forwarded-for') || undefined,
    userAgent: req?.headers.get('user-agent') || undefined,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
