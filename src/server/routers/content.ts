import { createContentSchema, updateContentSchema } from '@/shared/lib/schemas'
import { handleSupabaseError, handleSupabaseNotFound } from '@/shared/lib/utils'
import { z } from 'zod'
import { protectedProcedure, router } from '../trpc'

export const contentRouter = router({
  getAll: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      tags: z.array(z.string()).optional(),
      type: z.enum(['note', 'image', 'link']).optional(),
      cursor: z.number().optional(), // offset based pagination
      limit: z.number().min(1).max(100).optional().default(20),
    }))
    .query(async ({ input, ctx }) => {
      const from = input.cursor ?? 0
      const to = from + (input.limit ?? 20) - 1

      if (input.search) {
        const { data, error } = await ctx.supabase.rpc('search_content_with_tags', {
          search: input.search,
          user_id: ctx.user.id,
          type: input.type,
          tags: input.tags,
          offset_val: from,
          limit_val: (to - from + 1)
        })

        if (error) handleSupabaseError(error)

        const nextCursor = data && data.length === (input.limit ?? 20) ? to + 1 : undefined

        return {
          items: data || [],
          nextCursor,
        }
      }

      let query = ctx.supabase
        .from('content')
        .select('*')
        .order('created_at', { ascending: false })
        .eq('user_id', ctx.user.id)

      if (input.tags && input.tags.length) query = query.contains('tags', input.tags)
      if (input.type) query = query.eq('type', input.type)

      const { data, error } = await query.range(from, to)

      if (error) handleSupabaseError(error)

      const nextCursor = data && data.length === (input.limit ?? 20) ? to + 1 : undefined

      return {
        items: data || [],
        nextCursor,
      }
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const { data, error } = await ctx.supabase
        .from('content')
        .select('*')
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .single()

      if (error) handleSupabaseNotFound(error, 'Контент не найден')

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

      if (error) handleSupabaseError(error)

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
        .eq('user_id', ctx.user.id)
        .select()
        .single()

      if (error) handleSupabaseError(error)

      return data
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { error } = await ctx.supabase
        .from('content')
        .delete()
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)

      if (error) handleSupabaseError(error)

      return { success: true }
    }),

  getTags: protectedProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('content')
        .select('tags')
        .eq('user_id', ctx.user.id)

      if (error) handleSupabaseError(error)

      const allTags = (data || [])
        .flatMap(item => item.tags || [])
        .filter((tag, index, array) => array.indexOf(tag) === index)

      return allTags
    }),

  getTagsWithContent: protectedProcedure
    .query(async ({ ctx }) => {
      const { data: content, error } = await ctx.supabase
        .from('content')
        .select('*')
        .eq('user_id', ctx.user.id)
        .order('created_at', { ascending: false });

      if (error) handleSupabaseError(error)

      if (!content) return [];

      const tagsMap = new Map<string, typeof content>();

      for (const item of content) {
        if (item.tags) {
          for (const tag of item.tags) {
            if (!tagsMap.has(tag)) {
              tagsMap.set(tag, []);
            }
            const items = tagsMap.get(tag)!;
            if (items.length < 3) {
              items.push(item);
            }
          }
        }
      }

      return Array.from(tagsMap.entries()).map(([tag, items]) => ({
        tag,
        items,
      }));
    }),
}) 