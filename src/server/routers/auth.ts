import { authSchema } from '@/shared/lib/schemas'
import { handleAuthError, handleConflictError, handleSupabaseError } from '@/shared/lib/utils'
import { publicProcedure, router } from '../trpc'

export const authRouter = router({
  register: publicProcedure
    .input(authSchema)
    .mutation(async ({ input, ctx }) => {
      const { data, error } = await ctx.supabase.auth.signUp({
        email: input.email,
        password: input.password,
      })

      if (error) {
        if (typeof error.message === 'string' && error.message.toLowerCase().includes('already')) {
          handleConflictError('Пользователь с таким email уже существует')
        }
        handleAuthError(error)
      }

      return { user: data.user }
    }),

  login: publicProcedure
    .input(authSchema)
    .mutation(async ({ input, ctx }) => {
      const { data, error } = await ctx.supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      })

      if (error) handleAuthError(error, 'UNAUTHORIZED')

      return { user: data.user, session: data.session }
    }),

  logout: publicProcedure
    .mutation(async ({ ctx }) => {
      const { error } = await ctx.supabase.auth.signOut()

      if (error) handleSupabaseError(error)

      return { success: true }
    }),
}) 