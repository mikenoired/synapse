import type { Context } from '../context'
import { TRPCError } from '@trpc/server'
import { eq } from 'drizzle-orm'
import { users } from '../db/schema'

export default class UserRepository {
  constructor(private readonly ctx: Context) { }

  async getUser() {
    if (!this.ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
      })
    }

    const user = await this.ctx.db.query.users.findFirst({
      where: eq(users.id, this.ctx.user.id),
      columns: {
        id: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      })
    }

    return user
  }
}
