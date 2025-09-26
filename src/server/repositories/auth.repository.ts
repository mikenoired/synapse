import type { Context } from '../context'

export default class AuthRepository {
  constructor(private readonly ctx: Context) { }

  async registerUser(email: string, password: string) {
    const { data, error } = await this.ctx.supabase.auth.signUp({
      email,
      password,
    })
    return { data, error }
  }

  async loginUser(email: string, password: string) {
    const { data, error } = await this.ctx.supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  async logoutUser() {
    const { error } = await this.ctx.supabase.auth.signOut()
    return { error }
  }
}
