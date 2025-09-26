import type { Context } from '../context'
import { handleSupabaseError } from '@/shared/lib/utils'

export default class UserRepository {
  constructor(private readonly ctx: Context) { }

  async getUser() {
    const { data, error } = await this.ctx.supabase.auth.getUser()
    if (error)
      handleSupabaseError(error)
    return data.user
  }
}
