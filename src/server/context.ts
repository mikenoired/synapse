import { createSupabaseClient } from '@/shared/api/supabase-client'
import type { NextRequest } from 'next/server'

export async function createContext({ req }: { req?: NextRequest }) {
  // Получаем токен из заголовков
  const token = req?.headers.get('authorization')?.replace('Bearer ', '')

  // Создаем клиент с anon key для RLS
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