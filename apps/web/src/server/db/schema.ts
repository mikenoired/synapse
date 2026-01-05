import { relations } from 'drizzle-orm'
import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

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
  documentImages: jsonb('document_images'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
}, table => ({
  userIdIdx: index('content_user_id_idx').on(table.userId),
  typeIdx: index('content_type_idx').on(table.type),
  createdAtIdx: index('content_created_at_idx').on(table.createdAt),
  userIdTypeIdx: index('content_user_id_type_idx').on(table.userId, table.type),
  userIdCreatedAtIdx: index('content_user_id_created_at_idx').on(table.userId, table.createdAt),
}))

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
}, table => ({
  userIdIdx: index('tags_user_id_idx').on(table.userId),
  titleIdx: index('tags_title_idx').on(table.title),
  userIdTitleIdx: index('tags_user_id_title_idx').on(table.userId, table.title),
}))

export const contentTags = pgTable('content_tags', {
  contentId: uuid('content_id').notNull().references(() => content.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
}, table => ({
  contentIdIdx: index('content_tags_content_id_idx').on(table.contentId),
  tagIdIdx: index('content_tags_tag_id_idx').on(table.tagId),
  userIdIdx: index('content_tags_user_id_idx').on(table.userId),
  contentIdTagIdIdx: index('content_tags_content_id_tag_id_idx').on(table.contentId, table.tagId),
}))

export const nodes = pgTable('nodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull(),
  content: text('content'),
  metadata: jsonb('metadata'),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
}, table => ({
  userIdIdx: index('nodes_user_id_idx').on(table.userId),
  typeIdx: index('nodes_type_idx').on(table.type),
}))

export const edges = pgTable('edges', {
  id: uuid('id').primaryKey().defaultRandom(),
  fromNode: uuid('from_node').references(() => nodes.id, { onDelete: 'cascade' }),
  toNode: uuid('to_node').references(() => nodes.id, { onDelete: 'cascade' }),
  relationType: text('relation_type').notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
}, table => ({
  fromNodeIdx: index('edges_from_node_idx').on(table.fromNode),
  toNodeIdx: index('edges_to_node_idx').on(table.toNode),
  userIdIdx: index('edges_user_id_idx').on(table.userId),
  fromNodeToNodeIdx: index('edges_from_node_to_node_idx').on(table.fromNode, table.toNode),
}))

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
