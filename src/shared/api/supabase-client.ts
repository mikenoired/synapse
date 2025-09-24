import type { Database } from '@/shared/types/database'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey)
  throw new Error('Missing Supabase environment variables')

export function createSupabaseClient(token?: string) {
  return createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    token
      ? {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
      : undefined,
  )
}
