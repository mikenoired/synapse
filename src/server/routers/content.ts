import { createContentSchema, updateContentSchema } from '@/lib/schemas'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure, router } from '../trpc'

export const contentRouter = router({
  getAll: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      tags: z.array(z.string()).optional(),
      type: z.enum(['note', 'image', 'link']).optional(),
    }))
    .query(async ({ input, ctx }) => {
      let query = ctx.supabase
        .from('content')
        .select('*')
        .order('created_at', { ascending: false })

      if (input.search) {
        query = query.or(`title.ilike.%${input.search}%,content.ilike.%${input.search}%`)
      }

      if (input.tags && input.tags.length > 0) {
        query = query.contains('tags', input.tags)
      }

      if (input.type) {
        query = query.eq('type', input.type)
      }

      const { data, error } = await query

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })
      }

      return data || []
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const { data, error } = await ctx.supabase
        .from('content')
        .select('*')
        .eq('id', input.id)
        .single()

      if (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Content not found',
        })
      }

      return data
    }),

  create: protectedProcedure
    .input(createContentSchema)
    .mutation(async ({ input, ctx }) => {
      const { data, error } = await ctx.supabase
        .from('content')
        .insert([{
          ...input,
          user_id: ctx.user.id,
        }])
        .select()
        .single()

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })
      }

      return data
    }),

  update: protectedProcedure
    .input(updateContentSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input

      const { data, error } = await ctx.supabase
        .from('content')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })
      }

      return data
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { error } = await ctx.supabase
        .from('content')
        .delete()
        .eq('id', input.id)

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })
      }

      return { success: true }
    }),

  getTags: protectedProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('content')
        .select('tags')

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })
      }

      const allTags = (data || [])
        .flatMap(item => item.tags || [])
        .filter((tag, index, array) => array.indexOf(tag) === index)

      return allTags
    }),
}) 