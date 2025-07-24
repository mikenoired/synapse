import { z } from 'zod'

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  created_at: z.string(),
})

export const contentSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  type: z.enum(['note', 'image', 'link']),
  title: z.string().optional(),
  content: z.string(),
  tags: z.array(z.string()).default([]),
  reminder_at: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const tagSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional(),
  user_id: z.string(),
})

export const createContentSchema = z.object({
  type: z.enum(['note', 'image', 'link']),
  title: z.string().optional(),
  content: z.string(),
  tags: z.array(z.string()).default([]),
  reminder_at: z.string().optional(),
})

export const updateContentSchema = createContentSchema.partial().extend({
  id: z.string(),
})

export const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export type User = z.infer<typeof userSchema>
export type Content = z.infer<typeof contentSchema>
export type Tag = z.infer<typeof tagSchema>
export type CreateContent = z.infer<typeof createContentSchema>
export type UpdateContent = z.infer<typeof updateContentSchema>
export type Auth = z.infer<typeof authSchema> 