import { authSchema } from '@/lib/schemas'
import { TRPCError } from '@trpc/server'
import { publicProcedure, router } from '../trpc'

export const authRouter = router({
  register: publicProcedure
    .input(authSchema)
    .mutation(async ({ input, ctx }) => {
      const { data: existingUser } = await ctx.supabase
        .from('users')
        .select('id')
        .eq('email', input.email)
        .single()

      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User already exists',
        })
      }

      const { data, error } = await ctx.supabase.auth.signUp({
        email: input.email,
        password: input.password,
      })

      if (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
        })
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

      if (error) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: error.message,
        })
      }

      return { user: data.user, session: data.session }
    }),

  logout: publicProcedure
    .mutation(async ({ ctx }) => {
      const { error } = await ctx.supabase.auth.signOut()

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })
      }

      return { success: true }
    }),
}) 