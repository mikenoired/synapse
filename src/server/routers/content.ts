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
    }))
    .query(async ({ input, ctx }) => {
      let query = ctx.supabase
        .from('content')
        .select('*')
        .order('created_at', { ascending: false })

      if (input.search) {
        query = query.or(`title.ilike.%${input.search}%,content.ilike.%${input.search}%`)
      }

      if (input.tags && input.tags.length) query = query.contains('tags', input.tags)

      if (input.type) query = query.eq('type', input.type)

      const { data, error } = await query

      if (error) handleSupabaseError(error)

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

      if (error) handleSupabaseError(error)

      return { success: true }
    }),

  getTags: protectedProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('content')
        .select('tags')

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