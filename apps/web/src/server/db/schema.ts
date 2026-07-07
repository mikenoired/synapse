import { relations, sql } from "drizzle-orm";
import {
	boolean,
	check,
	customType,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

import type { UserPreferences } from "@/shared/lib/user-preferences";
import { DEFAULT_USER_PREFERENCES } from "@/shared/lib/user-preferences";

const tsvector = customType<{ data: string }>({
	dataType() {
		return "tsvector";
	},
});

export const users = pgTable("users", {
	id: uuid("id").primaryKey().defaultRandom(),
	email: text("email").notNull().unique(),
	passwordHash: text("password_hash").notNull(),
	preferences: jsonb("preferences").$type<UserPreferences>().notNull().default(DEFAULT_USER_PREFERENCES),
	plan: text("plan").notNull().default("starter"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const content = pgTable(
	"content",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		type: text("type").notNull(),
		content: text("content").notNull(),
		searchText: text("search_text").notNull().default(""),
		searchVector: tsvector("search_vector")
			.notNull()
			.default(sql`''::tsvector`),
		title: text("title"),
		thumbnailBase64: text("thumbnail_base64"),
		documentImages: jsonb("document_images"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
		userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
	},
	(table) => ({
		userIdIdx: index("content_user_id_idx").on(table.userId),
		typeIdx: index("content_type_idx").on(table.type),
		createdAtIdx: index("content_created_at_idx").on(table.createdAt),
		userIdTypeIdx: index("content_user_id_type_idx").on(table.userId, table.type),
		userIdCreatedAtIdx: index("content_user_id_created_at_idx").on(table.userId, table.createdAt),
		searchVectorIdx: index("content_search_vector_idx").using("gin", table.searchVector),
	})
);

export const tags = pgTable(
	"tags",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		title: text("title").notNull(),
		userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
	},
	(table) => ({
		userIdIdx: index("tags_user_id_idx").on(table.userId),
		titleIdx: index("tags_title_idx").on(table.title),
		userIdTitleIdx: index("tags_user_id_title_idx").on(table.userId, table.title),
	})
);

export const contentTags = pgTable(
	"content_tags",
	{
		contentId: uuid("content_id")
			.notNull()
			.references(() => content.id, { onDelete: "cascade" }),
		tagId: uuid("tag_id")
			.notNull()
			.references(() => tags.id, { onDelete: "cascade" }),
		userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
	},
	(table) => ({
		contentIdIdx: index("content_tags_content_id_idx").on(table.contentId),
		tagIdIdx: index("content_tags_tag_id_idx").on(table.tagId),
		userIdIdx: index("content_tags_user_id_idx").on(table.userId),
		contentIdTagIdIdx: index("content_tags_content_id_tag_id_idx").on(table.contentId, table.tagId),
	})
);

export const nodes = pgTable(
	"nodes",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		type: text("type").notNull(),
		content: text("content"),
		metadata: jsonb("metadata"),
		userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
	},
	(table) => ({
		userIdIdx: index("nodes_user_id_idx").on(table.userId),
		typeIdx: index("nodes_type_idx").on(table.type),
	})
);

export const edges = pgTable(
	"edges",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		fromNode: uuid("from_node").references(() => nodes.id, { onDelete: "cascade" }),
		toNode: uuid("to_node").references(() => nodes.id, { onDelete: "cascade" }),
		relationType: text("relation_type").notNull(),
		userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
	},
	(table) => ({
		fromNodeIdx: index("edges_from_node_idx").on(table.fromNode),
		toNodeIdx: index("edges_to_node_idx").on(table.toNode),
		userIdIdx: index("edges_user_id_idx").on(table.userId),
		fromNodeToNodeIdx: index("edges_from_node_to_node_idx").on(table.fromNode, table.toNode),
	})
);

export const aiUsage = pgTable(
	"ai_usage",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
		provider: text("provider").notNull(),
		model: text("model").notNull(),
		feature: text("feature").notNull().default("tag_suggestion"),
		inputTokens: integer("input_tokens").notNull().default(0),
		outputTokens: integer("output_tokens").notNull().default(0),
		inputCostUsd: numeric("input_cost_usd", { precision: 12, scale: 8 }).notNull().default("0"),
		outputCostUsd: numeric("output_cost_usd", { precision: 12, scale: 8 }).notNull().default("0"),
		totalCostUsd: numeric("total_cost_usd", { precision: 12, scale: 8 }).notNull().default("0"),
		success: boolean("success").notNull(),
		errorType: text("error_type"),
		errorMessage: text("error_message"),
		latencyMs: integer("latency_ms"),
		// Plain uuid without FK: billing history must survive cascade content deletion
		contentId: uuid("content_id"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
	},
	(table) => ({
		userIdCreatedAtIdx: index("ai_usage_user_id_created_at_idx").on(table.userId, table.createdAt),
		userIdFeatureCreatedAtIdx: index("ai_usage_user_id_feature_created_at_idx").on(
			table.userId,
			table.feature,
			table.createdAt
		),
		successTokensChk: check(
			"ai_usage_success_tokens_chk",
			sql`success = true OR (input_tokens = 0 AND output_tokens = 0)`
		),
	})
);

export const usersRelations = relations(users, ({ many }) => ({
	content: many(content),
	tags: many(tags),
	nodes: many(nodes),
	edges: many(edges),
	aiUsage: many(aiUsage),
}));

export const contentRelations = relations(content, ({ one, many }) => ({
	user: one(users, {
		fields: [content.userId],
		references: [users.id],
	}),
	contentTags: many(contentTags),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
	user: one(users, {
		fields: [tags.userId],
		references: [users.id],
	}),
	contentTags: many(contentTags),
}));

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
}));

export const nodesRelations = relations(nodes, ({ one, many }) => ({
	user: one(users, {
		fields: [nodes.userId],
		references: [users.id],
	}),
	edgesFrom: many(edges, { relationName: "fromNode" }),
	edgesTo: many(edges, { relationName: "toNode" }),
}));

export const edgesRelations = relations(edges, ({ one }) => ({
	user: one(users, {
		fields: [edges.userId],
		references: [users.id],
	}),
	fromNode: one(nodes, {
		fields: [edges.fromNode],
		references: [nodes.id],
		relationName: "fromNode",
	}),
	toNode: one(nodes, {
		fields: [edges.toNode],
		references: [nodes.id],
		relationName: "toNode",
	}),
}));
