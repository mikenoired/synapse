import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { contentTypeSchema } from "@/shared/lib/schemas";

import { RedisRateLimiter } from "../lib/redis-rate-limiter";
import AiUsageRepository from "../repositories/ai-usage.repository";
import AiTaggingService from "../services/ai-tagging.service";
import { protectedProcedure, router } from "../trpc";

// Stricter limit than the global mutation limiter: tag generation spends tokens.
const aiTagLimiter = new RedisRateLimiter({
	windowMs: Number(process.env.AI_TAG_RATE_WINDOW_MS ?? 60_000),
	limit: Number(process.env.AI_TAG_RATE_LIMIT ?? 10),
});

const aiSuggestTagsSchema = z.discriminatedUnion("mode", [
	z
		.object({
			mode: z.literal("draft"),
			type: contentTypeSchema,
			title: z.string().optional(),
			content: z.string().optional(),
			image: z.string().optional(),
		})
		.refine((v) => Boolean(v.image) || (v.content && v.content.length > 0), {
			message: "Either content or image is required",
		}),
	z.object({
		mode: z.literal("existing"),
		contentId: z.string().min(1),
	}),
]);

const aiTagLimiterMiddleware = protectedProcedure.use(async ({ ctx, next }) => {
	const identity = ctx.user?.id || ctx.ip || "anonymous";
	const allowed = await aiTagLimiter.checkLimit(`ai:tag:${identity}`);
	if (!allowed) {
		throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many tag generation requests" });
	}
	return next();
});

export const aiRouter = router({
	getUsageOverview: protectedProcedure.query(async ({ ctx }) => {
		const repository = new AiUsageRepository(ctx);
		return repository.getOverview();
	}),
	suggestTags: aiTagLimiterMiddleware.input(aiSuggestTagsSchema).mutation(async ({ input, ctx }) => {
		const service = new AiTaggingService(ctx);
		return service.suggestTags(input);
	}),
});
