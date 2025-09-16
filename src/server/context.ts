import { createSupabaseClient } from '@/shared/api/supabase-client'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

export async function createContext({ req }: { req?: NextRequest }) {
  const headerToken = req?.headers.get('authorization')?.replace('Bearer ', '')
  const cookieStore = await cookies().catch(() => undefined)
  const cookieToken = cookieStore?.get('opi_token')?.value
  const token = headerToken || cookieToken

  console.log('token', token)

  const supabase = createSupabaseClient(token)

  let user = null
  if (token) {
    try {
      // Проверяем токен и получаем пользователя
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
  }
}

export type Context = Awaited<ReturnType<typeof createContext>> 