import { TRPCError } from '@trpc/server'
import { authSchema } from '@/shared/lib/schemas'
import { signRefreshToken, signToken, verifyRefreshToken } from '../lib/jwt'
import AuthService from '../services/auth.service'
import { publicProcedure, router } from '../trpc'

export const authRouter = router({
  register: publicProcedure
    .input(authSchema)
    .mutation(async ({ input, ctx }) => {
      const service = new AuthService(ctx)
      return await service.register(input.email, input.password)
    }),

  login: publicProcedure
    .input(authSchema)
    .mutation(async ({ input, ctx }) => {
      const service = new AuthService(ctx)
      return await service.login(input.email, input.password)
    }),

  refresh: publicProcedure
    .mutation(async ({ ctx }) => {
      const refreshToken = ctx.refreshToken

      if (!refreshToken) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Refresh токен не найден',
        })
      }

      const payload = verifyRefreshToken(refreshToken)

      if (!payload) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Недействительный refresh токен',
        })
      }

      const accessToken = signToken({
        userId: payload.userId,
        email: payload.email,
      })

      const newRefreshToken = signRefreshToken({
        userId: payload.userId,
        email: payload.email,
      })

      return {
        token: accessToken,
        refreshToken: newRefreshToken,
      }
    }),

  logout: publicProcedure
    .mutation(async ({ ctx }) => {
      const service = new AuthService(ctx)
      return await service.logout()
    }),
})
