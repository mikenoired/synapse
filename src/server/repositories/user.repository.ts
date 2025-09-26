import type { Context } from '../context'

export default class UserRepository {
  constructor(private readonly ctx: Context) { }

  async getUser() {
    const { data, error } = await this.ctx.supabase.auth.getUser()
    if (error)
      throw new Error(error.message)
    return data.user
  }
}
