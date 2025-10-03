import { relations } from 'drizzle-orm'
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const content = pgTable('content', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull(),
  content: text('content').notNull(),
  title: text('title'),
  thumbnailBase64: text('thumbnail_base64'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
})

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
})

export const contentTags = pgTable('content_tags', {
  contentId: uuid('content_id').notNull().references(() => content.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
})

export const nodes = pgTable('nodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull(),
  content: text('content'),
  metadata: jsonb('metadata'),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
})

export const edges = pgTable('edges', {
  id: uuid('id').primaryKey().defaultRandom(),
  fromNode: uuid('from_node').references(() => nodes.id, { onDelete: 'cascade' }),
  toNode: uuid('to_node').references(() => nodes.id, { onDelete: 'cascade' }),
  relationType: text('relation_type').notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
})

export const usersRelations = relations(users, ({ many }) => ({
  content: many(content),
  tags: many(tags),
  nodes: many(nodes),
  edges: many(edges),
}))

export const contentRelations = relations(content, ({ one, many }) => ({
  user: one(users, {
    fields: [content.userId],
    references: [users.id],
  }),
  contentTags: many(contentTags),
}))

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, {
    fields: [tags.userId],
    references: [users.id],
  }),
  contentTags: many(contentTags),
}))

export const contentTagsRelations = relations(contentTags, ({ one }) => ({
  content: one(content, {
    fields: [contentTags.contentId],
    references: [content.id],
  }),
  tag: one(tags, {
    fields: [contentTags.tagId],
    references: [tags.id],
  }),
  user: one(users, {
    fields: [contentTags.userId],
    references: [users.id],
  }),
}))

export const nodesRelations = relations(nodes, ({ one, many }) => ({
  user: one(users, {
    fields: [nodes.userId],
    references: [users.id],
  }),
  edgesFrom: many(edges, { relationName: 'fromNode' }),
  edgesTo: many(edges, { relationName: 'toNode' }),
}))

export const edgesRelations = relations(edges, ({ one }) => ({
  user: one(users, {
    fields: [edges.userId],
    references: [users.id],
  }),
  fromNode: one(nodes, {
    fields: [edges.fromNode],
    references: [nodes.id],
    relationName: 'fromNode',
  }),
  toNode: one(nodes, {
    fields: [edges.toNode],
    references: [nodes.id],
    relationName: 'toNode',
  }),
}))
