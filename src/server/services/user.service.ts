import type { Context } from '../context'
import UserRepository from '../repositories/user.repository'

export default class UserService {
  private repo: UserRepository

  constructor(ctx: Context) {
    this.repo = new UserRepository(ctx)
  }

  async getUser() {
    return await this.repo.getUser()
  }
}
