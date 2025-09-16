import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database'

export function createSupabaseClient(token?: string) {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    token ? {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    } : undefined,
  )
} 