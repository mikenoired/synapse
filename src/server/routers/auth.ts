import { authSchema } from '@/shared/lib/schemas'
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

  logout: publicProcedure
    .mutation(async ({ ctx }) => {
      const service = new AuthService(ctx)
      return await service.logout()
    }),
})
