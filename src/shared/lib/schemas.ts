import { z } from 'zod'

export const userSchema = z.object({
  id: z.string(),
  email: z.email(),
  created_at: z.string(),
})

// Схема для структурированного контента (как в editor)
export const contentBlockSchema = z.object({
  type: z.enum(['paragraph', 'heading', 'image', 'list', 'quote', 'code', 'divider']),
  content: z.string().optional(),
  attrs: z.record(z.any(), z.any()).optional(),
  marks: z.array(z.object({
    type: z.string(),
    attrs: z.record(z.any(), z.any()).optional(),
  })).optional(),
})

export const structuredContentSchema = z.object({
  type: z.literal('doc'),
  content: z.array(contentBlockSchema),
})

// Схема для контента ссылок в JSON формате
export const linkContentSchema = z.object({
  url: z.url(),
  title: z.string(),
  description: z.string(),
  content: structuredContentSchema, // Теперь структурированный контент!
  rawText: z.string(), // Для поиска - текстовая версия
  metadata: z.object({
    image: z.string().optional(),
    favicon: z.string().optional(),
    siteName: z.string().optional(),
    author: z.string().optional(),
    publishedTime: z.string().optional(),
    extractedAt: z.string(),
    contentBlocks: z.number(), // Количество блоков контента
    images: z.array(z.string()).optional(), // Все изображения в статье
  }),
  parsing: z.object({
    method: z.string(),
    userAgent: z.string(),
    success: z.boolean(),
    warnings: z.array(z.string()).optional(),
    extractedImages: z.number().optional(), // Количество извлеченных изображений
  }),
})

export const contentSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  type: z.enum(['note', 'media', 'link', 'todo', 'audio']),
  title: z.string().optional(),
  content: z.string(), // Для link: JSON с linkContentSchema, для остальных: оригинальный формат
  // View-only tag titles derived from relations
  tags: z.array(z.string()).default([]),
  // New normalized tag ids (content_tags)
  tag_ids: z.array(z.string()).default([]),
  created_at: z.string(),
  updated_at: z.string(),
  media_url: z.string().optional(),
  url: z.string().optional(),
  media_type: z.enum(['image', 'video']).optional(),
  thumbnail_url: z.string().optional(),
  thumbnail_base64: z.string().optional(),
  media_width: z.number().optional(),
  media_height: z.number().optional(),
})

// Thin list item for collections (avoid heavy fields later if needed)
export const contentListItemSchema = contentSchema.pick({
  id: true,
  user_id: true,
  type: true,
  title: true,
  content: true,
  tags: true,
  tag_ids: true,
  created_at: true,
  updated_at: true,
  media_url: true,
  url: true,
  media_type: true,
  thumbnail_url: true,
  thumbnail_base64: true,
  media_width: true,
  media_height: true,
})

// Detailed view (same as contentSchema for now; reserved for future extra fields)
export const contentDetailSchema = contentSchema

export const tagSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional(),
  user_id: z.string(),
})

export const createContentSchema = z.object({
  type: z.enum(['note', 'media', 'link', 'todo', 'audio']),
  title: z.string().optional(),
  content: z.string(), // Для link: JSON строка с linkContentSchema
  // New API: tag ids
  tag_ids: z.array(z.string()).optional(),
  // Back-compat: titles (deprecated)
  tags: z.array(z.string()).optional(),
  url: z.string().optional(),
  media_url: z.string().optional(),
  media_type: z.enum(['image', 'video']).optional(),
  thumbnail_url: z.string().optional(),
  thumbnail_base64: z.string().optional(),
  media_width: z.number().optional(),
  media_height: z.number().optional(),
})

export const updateContentSchema = createContentSchema.partial().extend({
  id: z.string(),
})

export const authSchema = z.object({
  email: z.email('Некорректный email адрес'),
  password: z.string()
    .min(8, 'Пароль должен содержать минимум 8 символов')
    .regex(/[A-Z]/, 'Пароль должен содержать хотя бы одну заглавную букву')
    .regex(/[a-z]/, 'Пароль должен содержать хотя бы одну строчную букву')
    .regex(/\d/, 'Пароль должен содержать хотя бы одну цифру'),
})

export type User = z.infer<typeof userSchema>
export type Content = z.infer<typeof contentSchema>
export type ContentListItem = z.infer<typeof contentListItemSchema>
export type ContentDetail = z.infer<typeof contentDetailSchema>
export type LinkContent = z.infer<typeof linkContentSchema>
export type Tag = z.infer<typeof tagSchema>
export type CreateContent = z.infer<typeof createContentSchema>
export type UpdateContent = z.infer<typeof updateContentSchema>
export type Auth = z.infer<typeof authSchema>

// Хелпер функции для работы с link content
export function parseLinkContent(content: string): LinkContent | null {
  try {
    const parsed = JSON.parse(content)
    return linkContentSchema.parse(parsed)
  }
  catch {
    return null
  }
}

export function stringifyLinkContent(linkContent: LinkContent): string {
  return JSON.stringify(linkContent)
}

// ---- Media content helpers (for DB model with JSON in content) ----
export interface MediaJson {
  media: {
    object?: string
    url?: string
    type: 'image' | 'video'
    width?: number
    height?: number
    thumbnailUrl?: string
    thumbnailBase64?: string
  }
}

export function parseMediaJson(content: string): MediaJson | null {
  try {
    const parsed = JSON.parse(content)
    if (parsed && parsed.media && typeof parsed.media.type === 'string')
      return parsed as MediaJson
    return null
  }
  catch {
    return null
  }
}

// ---- Audio content helpers ----
export interface AudioJson {
  audio: {
    object?: string
    url?: string
    mimeType?: string
    durationSec?: number
    bitrateKbps?: number
    sampleRateHz?: number
    channels?: number
    sizeBytes?: number
  }
  track?: {
    isTrack: boolean
    title?: string
    artist?: string
    album?: string
    year?: number
    genre?: string[]
    trackNumber?: number
    diskNumber?: number
    lyrics?: string
  }
  cover?: {
    object?: string
    url?: string
    width?: number
    height?: number
    thumbnailBase64?: string
  }
}

export function parseAudioJson(content: string): AudioJson | null {
  try {
    const parsed = JSON.parse(content)
    if (parsed && parsed.audio)
      return parsed as AudioJson
    return null
  }
  catch {
    return null
  }
}

// Функция для извлечения текста из структурированного контента (для поиска)
export function extractTextFromStructuredContent(structuredContent: any): string {
  if (!structuredContent?.content)
    return ''

  const extractFromBlock = (block: any): string => {
    if (block.type === 'text')
      return block.text || ''
    if (block.content) {
      if (Array.isArray(block.content)) {
        return block.content.map(extractFromBlock).join('')
      }
      return extractFromBlock(block.content)
    }
    return ''
  }

  return structuredContent.content
    .map(extractFromBlock)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Функция для расчета времени чтения статьи
export function calculateReadingTime(text: string): string {
  if (!text || text.trim().length === 0)
    return '0 мин'

  // Средняя скорость чтения: 200-250 слов в минуту (берем 225 как среднее)
  const wordsPerMinute = 225

  // Подсчет слов (разбиваем по пробелам и фильтруем пустые строки)
  const words = text.trim().split(/\s+/).filter(word => word.length > 0).length

  // Расчет времени в минутах
  const minutes = Math.ceil(words / wordsPerMinute)

  if (minutes < 1)
    return 'меньше минуты'
  if (minutes === 1)
    return '1 мин'
  if (minutes < 60)
    return `${minutes} мин`

  // Для времени больше часа
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0)
    return `${hours} ч`
  return `${hours} ч ${remainingMinutes} мин`
}

// Функция для расчета времени чтения из LinkContent
export function calculateReadingTimeFromLinkContent(linkContent: LinkContent): string {
  // Используем rawText если доступен, иначе извлекаем из структурированного контента
  const text = linkContent.rawText || extractTextFromStructuredContent(linkContent.content)
  return calculateReadingTime(text)
}
