import { z } from "zod";

import { createContentSchema, updateContentSchema } from "@/shared/lib/schemas";
import { contentTypeSchema } from "@/shared/lib/schemas";

import ContentService from "../services/content.service";
import { protectedProcedure, router } from "../trpc";

export const contentRouter = router({
	getAll: protectedProcedure
		.input(
			z.object({
				search: z.string().optional(),
				tagIds: z.array(z.string()).optional(),
				types: z.array(contentTypeSchema).optional(),
				cursor: z.string().optional(), // keyset: `${created_at}|${id}`
				limit: z.number().min(1).max(50).optional().default(12),
				includeTags: z.boolean().optional().default(true),
			})
		)
		.query(async ({ input, ctx }) => {
			const service = new ContentService(ctx);
			return await service.getAll(
				input.search,
				input.types,
				input.tagIds,
				input.cursor,
				input.limit || 12,
				input.includeTags
			);
		}),

	getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
		const service = new ContentService(ctx);
		return await service.getById(input.id);
	}),

	getSuggestions: protectedProcedure
		.input(
			z.object({
				contentId: z.string(),
				cursor: z.string().optional(),
				limit: z.number().min(1).max(30).default(12),
			})
		)
		.query(async ({ input, ctx }) => {
			const service = new ContentService(ctx);
			return await service.getSuggestions(input.contentId, input.cursor, input.limit);
		}),

	create: protectedProcedure.input(createContentSchema).mutation(async ({ input, ctx }) => {
		const service = new ContentService(ctx);
		return await service.create(input);
	}),

	update: protectedProcedure.input(updateContentSchema).mutation(async ({ input, ctx }) => {
		const service = new ContentService(ctx);
		return await service.update(input);
	}),

	delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
		const service = new ContentService(ctx);
		return await service.delete(input.id);
	}),

	getTags: protectedProcedure.query(async ({ ctx }) => {
		const service = new ContentService(ctx);
		return await service.getTags();
	}),

	getTagById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
		const service = new ContentService(ctx);
		return await service.getTagById(input.id);
	}),

	updateTagColor: protectedProcedure
		.input(z.object({ id: z.string(), color: z.number().int().min(0).max(255) }))
		.mutation(async ({ input, ctx }) => {
			const service = new ContentService(ctx);
			return await service.updateTagColor(input.id, input.color);
		}),

	getTagsWithContent: protectedProcedure.query(async ({ ctx }) => {
		const service = new ContentService(ctx);
		return await service.getTagsWithContent();
	}),

	getTagsWithContentPage: protectedProcedure
		.input(
			z.object({
				cursor: z.string().optional(),
				limit: z.number().min(1).max(50).default(24),
			})
		)
		.query(async ({ input, ctx }) => {
			const service = new ContentService(ctx);
			return await service.getTagsWithContentPage(input.cursor, input.limit);
		}),

	getAvailableTypes: protectedProcedure.query(async ({ ctx }) => {
		const service = new ContentService(ctx);
		return await service.getAvailableTypes();
	}),

	importFile: protectedProcedure
		.input(
			z.object({
				title: z.string().optional(),
				tags: z.array(z.string()).optional(),
				file: z.object({
					name: z.string(),
					type: z.string(),
					size: z.number(),
					buffer: z.array(z.number()),
				}),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const service = new ContentService(ctx);
			return service.importFile(input);
		}),
});
