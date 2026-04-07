import { and, eq, inArray, sql } from "drizzle-orm";

import type { Context } from "../../context";
import { contentTags, edges, nodes, tags } from "../../db/schema";
import type { UploadContentType } from "./upload-types";

export class UploadTagService {
	constructor(private readonly ctx: Context) {}

	async attachTags(contentId: string, titles: string[], type: UploadContentType, title?: string) {
		if (!titles.length) return;

		const tagIds = await this.resolveTagTitlesToIds(titles);
		if (!tagIds.length) return;

		const contentNodeId = await this.getOrCreateContentNode({ contentId, title, type });
		const tagNodeIdByTagId = await this.getOrCreateTagNodeIds(tagIds);
		await this.upsertContentTags(contentId, tagIds, contentNodeId, tagNodeIdByTagId);
	}

	private async resolveTagTitlesToIds(titles: string[]): Promise<string[]> {
		const uniqueTitles = Array.from(new Set(titles.filter(Boolean)));
		if (!uniqueTitles.length) return [];

		const existingTags = await this.ctx.db.query.tags.findMany({
			columns: { id: true, title: true },
			where: inArray(tags.title, uniqueTitles),
		});

		const tagIdByTitle = new Map(existingTags.map((tag) => [tag.title, tag.id]));
		const missingTitles = uniqueTitles.filter((title) => !tagIdByTitle.has(title));

		if (missingTitles.length) {
			const insertedTags = await this.ctx.db
				.insert(tags)
				.values(missingTitles.map((title) => ({ title })))
				.returning({ id: tags.id, title: tags.title });

			for (const tag of insertedTags) tagIdByTitle.set(tag.title, tag.id);
		}

		return uniqueTitles
			.map((title) => tagIdByTitle.get(title))
			.filter((tagId): tagId is string => typeof tagId === "string" && tagId.length > 0);
	}

	private async getOrCreateContentNode(params: {
		contentId: string;
		title?: string;
		type: UploadContentType;
	}) {
		const existingNode = await this.ctx.db.query.nodes.findFirst({
			columns: { id: true },
			where: and(
				eq(nodes.userId, this.requireUserId()),
				sql`${nodes.metadata}->>'content_id' = ${params.contentId}`
			),
		});

		if (existingNode?.id) return existingNode.id;

		const [createdNode] = await this.ctx.db
			.insert(nodes)
			.values({
				content: params.title ?? "",
				metadata: { content_id: params.contentId },
				type: params.type,
				userId: this.requireUserId(),
			})
			.returning({ id: nodes.id });

		return createdNode.id;
	}

	private async getOrCreateTagNodeIds(tagIds: string[]): Promise<Record<string, string>> {
		const tagNodeIdByTagId: Record<string, string> = {};
		const uniqueTagIds = Array.from(new Set(tagIds));
		if (!uniqueTagIds.length) return tagNodeIdByTagId;

		const existingNodes = await this.ctx.db.query.nodes.findMany({
			where: and(
				eq(nodes.userId, this.requireUserId()),
				eq(nodes.type, "tag"),
				inArray(sql`${nodes.metadata}->>'tag_id'`, uniqueTagIds)
			),
		});

		for (const node of existingNodes) {
			const metadata = node.metadata as { tag_id?: string } | null;
			if (metadata?.tag_id) tagNodeIdByTagId[metadata.tag_id] = node.id;
		}

		const missingTagIds = uniqueTagIds.filter((tagId) => !tagNodeIdByTagId[tagId]);
		if (!missingTagIds.length) return tagNodeIdByTagId;

		const tagRows = await this.ctx.db.query.tags.findMany({
			where: inArray(tags.id, missingTagIds),
		});

		if (!tagRows.length) return tagNodeIdByTagId;

		const createdNodes = await this.ctx.db
			.insert(nodes)
			.values(
				tagRows.map((tag) => ({
					content: tag.title ?? "",
					metadata: { tag_id: tag.id },
					type: "tag",
					userId: this.requireUserId(),
				}))
			)
			.returning();

		for (const node of createdNodes) {
			const metadata = node.metadata as { tag_id?: string } | null;
			if (metadata?.tag_id) tagNodeIdByTagId[metadata.tag_id] = node.id;
		}

		return tagNodeIdByTagId;
	}

	private async upsertContentTags(
		contentId: string,
		tagIds: string[],
		contentNodeId: string,
		tagNodeIdByTagId: Record<string, string>
	) {
		if (!tagIds.length) return;

		const uniqueTagIds = Array.from(new Set(tagIds));

		await this.ctx.db
			.insert(contentTags)
			.values(uniqueTagIds.map((tagId) => ({ contentId, tagId, userId: this.requireUserId() })));

		const edgeRows = uniqueTagIds
			.map((tagId) => ({
				fromNode: contentNodeId,
				relationType: "content_tag",
				toNode: tagNodeIdByTagId[tagId],
				userId: this.requireUserId(),
			}))
			.filter((edge) => Boolean(edge.toNode));

		if (edgeRows.length) await this.ctx.db.insert(edges).values(edgeRows);
	}

	private requireUserId(): string {
		if (!this.ctx.user?.id) throw new Error("Unauthorized");

		return this.ctx.user.id;
	}
}
