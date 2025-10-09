import { z } from 'zod'
import UploadService from '../services/upload.service'
import { protectedProcedure, router } from '../trpc'

const uploadFileSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  size: z.number().int().nonnegative(),
  content: z.string().min(1),
})

const uploadInputSchema = z.object({
  files: z.array(uploadFileSchema).min(1, 'No files provided'),
  title: z.string().trim().transform(value => value.length > 0 ? value : undefined).optional().nullable(),
  tags: z.array(z.string().trim()).optional(),
  makeTrack: z.boolean().optional(),
}).transform(({ files, title, tags, makeTrack }) => ({
  files,
  title: title ?? undefined,
  tags: tags?.filter(Boolean),
  makeTrack,
}))

export const uploadRouter = router({
  formData: protectedProcedure
    .input(uploadInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new UploadService(ctx)
      return await service.handleUpload(input)
    }),
})
