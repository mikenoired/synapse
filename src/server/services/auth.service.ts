import type { Context } from '../context'
import { handleAuthError, handleConflictError } from '@/shared/lib/utils'
import AuthRepository from '../repositories/auth.repository'

export default class AuthService {
  private repo: AuthRepository

  constructor(ctx: Context) {
    this.repo = new AuthRepository(ctx)
  }

  async register(email: string, password: string) {
    const { data, error } = await this.repo.registerUser(email, password)

    if (error) {
      if (typeof error.message === 'string' && error.message.toLowerCase().includes('already')) {
        handleConflictError('Пользователь с таким email уже существует')
      }
      handleAuthError(error)
    }

    return { user: data.user, session: data.session }
  }

  async login(email: string, password: string) {
    const { data, error } = await this.repo.loginUser(email, password)

    if (error)
      handleAuthError(error)

    return { user: data.user }
  }

  async logout() {
    const { error } = await this.repo.logoutUser()

    if (error)
      handleAuthError(error)

    return { success: true }
  }
}
