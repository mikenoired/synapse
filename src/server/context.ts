import { createSupabaseClient } from '@/shared/api/supabase-client'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

export async function createContext({ req }: { req?: NextRequest }) {
  const headerToken = req?.headers.get('authorization')?.replace('Bearer ', '')
  const cookieStore = await cookies().catch(() => undefined)
  const cookieToken = cookieStore?.get('opi_token')?.value
  const token = headerToken || cookieToken


  const supabase = createSupabaseClient(token)

  let user = null
  if (token) {
    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser(token)
      if (!error && authUser) {
        user = authUser
      }
    } catch (error) {
      console.error('Ошибка проверки токена:', error)
    }
  }

  return {
    supabase,
    req,
    user,
    token,
    requestId: req?.headers.get('x-request-id') || crypto.randomUUID?.() || undefined,
    ip: req?.headers.get('x-forwarded-for') || undefined,
    userAgent: req?.headers.get('user-agent') || undefined,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>> 