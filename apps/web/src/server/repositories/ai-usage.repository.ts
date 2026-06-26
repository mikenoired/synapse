import type { Context } from "../context";
import { aiUsage } from "../db/schema";
import { requireAuth } from "../lib/auth-guard";

export interface AiUsageRecord {
	provider: string;
	model: string;
	feature?: string;
	inputTokens: number;
	outputTokens: number;
	inputCostUsd: number;
	outputCostUsd: number;
	totalCostUsd: number;
	success: boolean;
	errorType?: string | null;
	errorMessage?: string | null;
	latencyMs?: number | null;
	contentId?: string | null;
}

export default class AiUsageRepository {
	constructor(private readonly ctx: Context) {}

	async record(input: AiUsageRecord): Promise<void> {
		requireAuth(this.ctx);
		await this.ctx.db.insert(aiUsage).values({
			userId: this.ctx.user.id,
			provider: input.provider,
			model: input.model,
			feature: input.feature ?? "tag_suggestion",
			inputTokens: input.inputTokens,
			outputTokens: input.outputTokens,
			inputCostUsd: input.inputCostUsd.toFixed(8),
			outputCostUsd: input.outputCostUsd.toFixed(8),
			totalCostUsd: input.totalCostUsd.toFixed(8),
			success: input.success,
			errorType: input.errorType ?? null,
			errorMessage: input.errorMessage ?? null,
			latencyMs: input.latencyMs ?? null,
			contentId: input.contentId ?? null,
		});
	}
}
