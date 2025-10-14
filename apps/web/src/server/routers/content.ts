import { z } from 'zod'
import { createContentSchema, updateContentSchema } from '@/shared/lib/schemas'
import ContentService from '../services/content.service'
import { protectedProcedure, router } from '../trpc'
import { contentTypeSchema } from '@/shared/lib/schemas'
import { parseFile, isSupportedFileType } from '../parsers'

export const contentRouter = router({
  getAll: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      tagIds: z.array(z.string()).optional(),
      type: contentTypeSchema.optional(),
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

  importFile: protectedProcedure
    .input(z.object({
      file: z.object({
        name: z.string(),
        type: z.string(),
        size: z.number(),
        buffer: z.array(z.number()), // ArrayBuffer как массив чисел
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      const { file } = input

      // Проверяем, поддерживается ли тип файла
      if (!isSupportedFileType(file.name, file.type)) {
        throw new Error(`Неподдерживаемый тип файла: ${file.name}`)
      }

      // Проверяем размер файла (максимум 50MB)
      const maxSize = 50 * 1024 * 1024 // 50MB
      if (file.size > maxSize) {
        throw new Error('Файл слишком большой. Максимальный размер: 50MB')
      }

      try {
        // Преобразуем массив чисел обратно в Buffer
        const buffer = Buffer.from(file.buffer)

        // Парсим файл
        const parsed = await parseFile({
          name: file.name,
          type: file.type,
          size: file.size,
          buffer: buffer,
        }, {
          extractThumbnail: true,
          maxContentLength: 1000000, // 1MB текста максимум
        })

        // Обрабатываем изображения документа
        let processedImages = undefined
        if (parsed.images && parsed.images.length > 0) {
          const { processDocumentImages, uploadDocumentImagesToMinio } = await import('@/server/lib/document-image-processor')

          // Обрабатываем изображения (создаем миниатюры)
          const processed = await processDocumentImages(parsed.images)

          // Загружаем полноразмерные изображения в MinIO
          const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          processedImages = await uploadDocumentImagesToMinio(processed, ctx.user.id, documentId)
        }

        // Создаем контент в базе данных
        const service = new ContentService(ctx)
        const content = await service.create({
          type: parsed.type as any,
          title: parsed.title || file.name,
          content: parsed.content,
          thumbnail_base64: parsed.thumbnailBase64,
          media_type: 'image', // По умолчанию для документов
          document_images: processedImages,
        })

        return {
          success: true,
          content,
        }
      } catch (error) {
        console.error('Import file error:', error)
        throw new Error(`Ошибка при импорте файла: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
      }
    }),
})
