import type { Context } from '../context'
import { TRPCError } from '@trpc/server'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { users } from '../db/schema'
import { signRefreshToken, signToken } from '../lib/jwt'

export default class AuthRepository {
  constructor(private readonly ctx: Context) { }

  async registerUser(email: string, password: string) {
    try {
      const existingUser = await this.ctx.db.query.users.findFirst({
        where: eq(users.email, email),
      })

      if (existingUser) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Пользователь с таким email уже существует',
        })
      }

      const passwordHash = await bcrypt.hash(password, 10)

      const [user] = await this.ctx.db.insert(users).values({
        email,
        passwordHash,
      }).returning()

      if (!user) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Не удалось создать пользователя',
        })
      }

      const accessToken = signToken({
        userId: user.id,
        email: user.email,
      })

      const refreshToken = signRefreshToken({
        userId: user.id,
        email: user.email,
      })

      return {
        data: {
          user: {
            id: user.id,
            email: user.email,
          },
          token: accessToken,
          refreshToken,
        },
        error: null,
      }
    }
    catch (error) {
      if (error instanceof TRPCError)
        throw error

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Ошибка регистрации',
      })
    }
  }

  async loginUser(email: string, password: string) {
    try {
      const user = await this.ctx.db.query.users.findFirst({
        where: eq(users.email, email),
      })

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Неверный email или пароль',
        })
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

      if (!isPasswordValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Неверный email или пароль',
        })
      }

      const accessToken = signToken({
        userId: user.id,
        email: user.email,
      })

      const refreshToken = signRefreshToken({
        userId: user.id,
        email: user.email,
      })

      return {
        data: {
          user: {
            id: user.id,
            email: user.email,
          },
          token: accessToken,
          refreshToken,
        },
        error: null,
      }
    }
    catch (error) {
      if (error instanceof TRPCError)
        throw error

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Ошибка входа',
      })
    }
  }

  async logoutUser() {
    return { error: null }
  }
}
