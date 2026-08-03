import { createContext } from "./context";
import type { Context } from "./context";
import { ApiError } from "./lib/api-error";
import ContentService from "./services/content.service";
import GraphService from "./services/graph.service";

export async function getServerCaller(ctx?: Context) {
	ctx ??= await createContext({});
	if (!ctx.user) throw new ApiError("UNAUTHORIZED", "Authentication required");

	const content = new ContentService(ctx);
	const graph = new GraphService(ctx);
	return {
		content: {
			getAll: (input: {
				search?: string;
				tagIds?: string[];
				types?: Parameters<ContentService["getAll"]>[1];
				cursor?: string;
				limit?: number;
				includeTags?: boolean;
			}) =>
				content.getAll(
					input.search,
					input.types,
					input.tagIds,
					input.cursor,
					input.limit ?? 12,
					input.includeTags ?? true
				),
			getTagById: (input: { id: string }) => content.getTagById(input.id),
			getTagsWithContentPage: (input: { cursor?: string; limit?: number }) =>
				content.getTagsWithContentPage(input.cursor, input.limit ?? 24),
		},
		graph: { getGraph: () => graph.getGraph() },
	};
}
