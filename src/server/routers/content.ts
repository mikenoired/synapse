import { z } from 'zod'
import { createContentSchema, updateContentSchema } from '@/shared/lib/schemas'
import ContentService from '../services/content.service'
import { protectedProcedure, router } from '../trpc'

export const contentRouter = router({
  getAll: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      tagIds: z.array(z.string()).optional(),
      type: z.enum(['note', 'media', 'link', 'todo', 'audio']).optional(),
      cursor: z.string().optional(), // keyset: `${created_at}|${id}`
      limit: z.number().min(1).max(50).optional().default(12),
      includeTags: z.boolean().optional().default(true),
    }))
    .query(async ({ input, ctx }) => {
      const service = new ContentService(ctx)
      return await service.getAll(input.search, input.type, input.tagIds, input.cursor, input.limit || 12, input.includeTags)
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const service = new ContentService(ctx)
      return await service.getById(input.id)
    }),

  create: protectedProcedure
    .input(createContentSchema)
    .mutation(async ({ input, ctx }) => {
      const service = new ContentService(ctx)
      return await service.create(input)
    }),

  update: protectedProcedure
    .input(updateContentSchema)
    .mutation(async ({ input, ctx }) => {
      const service = new ContentService(ctx)
      return await service.update(input)
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const service = new ContentService(ctx)
      return await service.delete(input.id)
    }),

  getTags: protectedProcedure
    .query(async ({ ctx }) => {
      const service = new ContentService(ctx)
      return await service.getTags()
    }),

  getTagById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const service = new ContentService(ctx)
      return await service.getTagById(input.id)
    }),

  getTagsWithContent: protectedProcedure
    .query(async ({ ctx }) => {
      const service = new ContentService(ctx)
      return await service.getTagsWithContent()
    }),
})
