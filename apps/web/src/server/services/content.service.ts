import { TRPCError } from "@trpc/server";
import type z from "zod";

import { deleteFile, getFileMetadata } from "@/shared/api/minio";
import type { Content, CreateContent, createContentSchema, updateContentSchema } from "@/shared/lib/schemas";
import {
	contentDetailSchema,
	contentListItemSchema,
	contentTypeSchema,
	parseAudioJson,
	parseMediaJson,
} from "@/shared/lib/schemas";

import type { Context } from "../context";
import type { content as contentTable } from "../db/schema";
import { buildContentSearchText } from "../lib/content-search";
import {
	deleteStoredNoteImages,
	deleteUploadedNoteImages,
	extractOwnedNoteImages,
	prepareNoteImages,
} from "../lib/note-images";
import { isSupportedFileType, parseFile } from "../parsers";
import ContentRepository from "../repositories/content.repository";

type ContentSelect = typeof contentTable.$inferSelect;
type ContentRow = Omit<ContentSelect, "searchText" | "searchVector"> &
	Partial<Pick<ContentSelect, "searchText" | "searchVector">>;

const TAGS_CACHE_TTL_SECONDS = Math.floor(Number(process.env.TAGS_CACHE_TTL_MS ?? 30000) / 1000);
const MAX_IMPORT_FILE_SIZE = 50 * 1024 * 1024;

export default class ContentService {
	private repo: ContentRepository;
	private ctx: Context;

	constructor(ctx: Context) {
		this.repo = new ContentRepository(ctx);
		this.ctx = ctx;
	}

	async getAll(
		search: string | undefined,
		type:
			| "note"
			| "media"
			| "link"
			| "todo"
			| "audio"
			| "doc"
			| "pdf"
			| "docx"
			| "epub"
			| "xlsx"
			| "csv"
			| undefined,
		tagIds: string[] | undefined,
		cursor: string | undefined,
		limit: number,
		includeTags: boolean
	) {
		if (search?.trim()) {
			return await this.searchContent(search.trim(), type, tagIds, limit, includeTags);
		}
		if (tagIds && tagIds.length) {
			return await this.getContentWithTagFilter(tagIds, limit, search, type, cursor, includeTags);
		}
		const data = await this.repo.getAll(search, type, cursor, limit);

		const contentRows = (data || []) as ContentRow[];
		const last = contentRows[contentRows.length - 1];
		const nextCursor = last ? `${last.createdAt}|${last.id}` : undefined;

		const items = includeTags
			? await this.attachTagsToContent(contentRows)
			: contentRows.map((r) => this.mapContentRow(r, this.ctx.user!.id));

		return {
			items: items.map((i) => contentListItemSchema.parse(i)),
			nextCursor,
		};
	}

	private async searchContent(
		search: string,
		type: Content["type"] | undefined,
		tagIds: string[] | undefined,
		limit: number,
		includeTags: boolean
	) {
		const rows = (await this.repo.searchFtsFiltered(search, type, tagIds, limit)) as ContentRow[];
		const items = includeTags
			? await this.attachTagsToContent(rows)
			: rows.map((row) => this.mapContentRow(row, this.ctx.user!.id));

		return {
			items: items.map((item) => contentListItemSchema.parse(item)),
			nextCursor: undefined,
		};
	}

	async getById(id: string) {
		const data = await this.repo.getById(id);
		const [withTags] = await this.attachTagsToContent([data as ContentRow]);
		return contentDetailSchema.parse(withTags);
	}

	private async getContentWithTagFilter(
		tagIds: string[],
		limit: number,
		search: string | undefined,
		type:
			| "note"
			| "media"
			| "link"
			| "todo"
			| "audio"
			| "doc"
			| "pdf"
			| "docx"
			| "epub"
			| "xlsx"
			| "csv"
			| undefined,
		cursor: string | undefined,
		includeTags: boolean
	) {
		const data = await this.repo.getWithTagFilter(tagIds, limit, search, type, cursor);
		const contentRows = (data || []) as ContentRow[];
		const last = contentRows[contentRows.length - 1];
		const nextCursor = last ? `${last.createdAt}|${last.id}` : undefined;

		const items = includeTags
			? await this.attachTagsToContent(contentRows)
			: contentRows.map((r) => this.mapContentRow(r, this.ctx.user!.id));

		return {
			items: items.map((i) => contentListItemSchema.parse(i)),
			nextCursor,
		};
	}

	async create(createContentData: z.infer<typeof createContentSchema>) {
		const prepared =
			createContentData.type === "note"
				? await prepareNoteImages(createContentData.content, this.ctx.user!.id)
				: { content: createContentData.content, uploaded: [] };
		const input = { ...createContentData, content: prepared.content };
		const { tag_ids: inputTagIds, tags: legacyTagTitles, ...contentData } = input;

		let result: ContentRow;
		try {
			result = (await this.ctx.db.transaction(async (tx) => {
				const repo = this.repo.withDb(tx as unknown as Context["db"]);
				const data = await repo.create(input);
				const contentId = (data as ContentRow).id;

				const contentNodeId = await repo.getOrCreateContentNode({
					content_id: contentId,
					title: contentData.title,
					type: contentData.type,
				});

				const tagIds = inputTagIds as string[] | undefined;
				const tagTitles = legacyTagTitles as string[] | undefined;
				let searchTags: string[] = [];
				if (tagIds && tagIds.length) {
					const tagNodeIds = await repo.getOrCreateTagNodeIds(tagIds);
					await this.upsertContentTags(repo, contentId, tagIds, contentNodeId, tagNodeIds);
					searchTags = (await repo.getTags(tagIds)).map((tag) => tag.title);
				} else if (tagTitles && tagTitles.length) {
					const ids = await this.resolveTagTitlesToIds(repo, tagTitles);
					if (ids.length) {
						const tagNodeIds = await repo.getOrCreateTagNodeIds(ids);
						await this.upsertContentTags(repo, contentId, ids, contentNodeId, tagNodeIds);
						searchTags = (await repo.getTags(ids)).map((tag) => tag.title);
					}
				}
				await repo.updateSearchText(
					contentId,
					buildContentSearchText({
						content: (data as ContentRow).content,
						tags: searchTags,
						title: (data as ContentRow).title,
					})
				);

				return data;
			})) as ContentRow;
		} catch (error) {
			await deleteUploadedNoteImages(prepared.uploaded);
			throw error;
		}

		await this.trackAddedNoteImages(prepared.uploaded);
		const [withTags] = await this.attachTagsToContent([result]);
		await this.invalidateUserTags();
		const content = contentDetailSchema.parse(withTags);
		return content;
	}

	async importFile(input: {
		title?: string;
		tags?: string[];
		file: { name: string; type: string; size: number; buffer: number[] };
	}) {
		const { file, tags, title } = input;

		if (!isSupportedFileType(file.name, file.type)) {
			throw new TRPCError({ code: "BAD_REQUEST", message: `Неподдерживаемый тип файла: ${file.name}` });
		}
		if (file.size > MAX_IMPORT_FILE_SIZE) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Файл слишком большой. Максимальный размер: 50MB",
			});
		}

		const buffer = Buffer.from(file.buffer);
		const parsed = await parseFile(
			{ name: file.name, type: file.type, size: file.size, buffer },
			{ extractThumbnail: true, maxContentLength: 1_000_000 }
		);

		let documentImages: CreateContent["document_images"];
		if (parsed.images && parsed.images.length > 0) {
			const { processDocumentImages, uploadDocumentImagesToMinio } =
				await import("@/server/lib/document-image-processor");
			const documentId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
			const processed = await processDocumentImages(parsed.images);
			documentImages = await uploadDocumentImagesToMinio(processed, this.ctx.user!.id, documentId);
		}

		const content = await this.create({
			type: contentTypeSchema.parse(parsed.type),
			title: title?.trim() || parsed.title || file.name,
			content: parsed.content,
			tags,
			thumbnail_base64: parsed.thumbnailBase64,
			media_type: "image",
			document_images: documentImages,
		});

		return { success: true, content };
	}

	async update(input: z.infer<typeof updateContentSchema>) {
		const { id, tag_ids: inputTagIds, tags: legacyTagTitles, ...updateData } = input;
		const previous = (await this.repo.getById(id)) as ContentRow;
		const nextType = updateData.type ?? previous.type;
		const prepared =
			nextType === "note" && updateData.content !== undefined
				? await prepareNoteImages(updateData.content, this.ctx.user!.id)
				: { content: updateData.content, uploaded: [] };
		const preparedInput = {
			...input,
			...(prepared.content === undefined ? {} : { content: prepared.content }),
		};

		let result: ContentRow;
		try {
			result = (await this.ctx.db.transaction(async (tx) => {
				const repo = this.repo.withDb(tx as unknown as Context["db"]);
				const data = await repo.updateContent(preparedInput);

				const tagIds = inputTagIds as string[] | undefined;
				const tagTitles = legacyTagTitles as string[] | undefined;
				const contentNodeId = await repo.getOrCreateContentNode({
					content_id: id,
					title: updateData.title,
					type: updateData.type || "note",
				});
				await repo.updateContentNode({
					content_id: id,
					title: updateData.title,
					type: updateData.type || (data as ContentRow).type,
				});

				let searchTags: string[] = [];
				if (tagIds) {
					const tagNodeIds = await repo.getOrCreateTagNodeIds(tagIds);
					await this.replaceContentTags(repo, id, tagIds, contentNodeId, tagNodeIds);
					searchTags = tagIds.length ? (await repo.getTags(tagIds)).map((tag) => tag.title) : [];
				} else if (tagTitles) {
					const ids = await this.resolveTagTitlesToIds(repo, tagTitles);
					const tagNodeIds = await repo.getOrCreateTagNodeIds(ids);
					await this.replaceContentTags(repo, id, ids, contentNodeId, tagNodeIds);
					searchTags = ids.length ? (await repo.getTags(ids)).map((tag) => tag.title) : [];
				} else {
					const [existingTags] = await repo.contentTagsWithTitles([id]);
					searchTags = existingTags?.tag_titles || [];
				}
				await repo.updateSearchText(
					id,
					buildContentSearchText({
						content: (data as ContentRow).content,
						tags: searchTags,
						title: (data as ContentRow).title,
					})
				);

				return data;
			})) as ContentRow;
		} catch (error) {
			await deleteUploadedNoteImages(prepared.uploaded);
			throw error;
		}

		const previousImages =
			previous.type === "note" ? extractOwnedNoteImages(previous.content, this.ctx.user!.id) : [];
		const nextImages = nextType === "note" ? extractOwnedNoteImages(result.content, this.ctx.user!.id) : [];
		const nextImageSet = new Set(nextImages);
		const removedSizes = await deleteStoredNoteImages(
			previousImages.filter((image) => !nextImageSet.has(image))
		);
		await Promise.all([
			this.trackAddedNoteImages(prepared.uploaded),
			this.trackRemovedNoteImages(removedSizes),
		]);

		const [withTags] = await this.attachTagsToContent([result]);
		await this.invalidateUserTags();
		const content = contentDetailSchema.parse(withTags);
		return content;
	}

	async delete(id: string) {
		const content = await this.repo.getById(id);

		await this.ctx.db.transaction(async (tx) => {
			const repo = this.repo.withDb(tx as unknown as Context["db"]);
			const node = await repo.getNodeByContentId(id);
			const contentNodeId = (node as { id: string } | null)?.id;

			await repo.deleteContentTag(id);
			if (contentNodeId) {
				await repo.deleteEdge(contentNodeId);
				await repo.deleteNode(contentNodeId);
			}

			await repo.deleteContent(id);
		});

		let totalFileSize = 0;
		const removedFileSizes: number[] = [];

		if (content.type === "note") {
			removedFileSizes.push(
				...(await deleteStoredNoteImages(extractOwnedNoteImages(content.content, this.ctx.user!.id)))
			);
		} else if (content.type === "media") {
			const mediaJson = parseMediaJson(content.content);
			const mainObject = mediaJson?.media?.object || this.extractObjectNameFromApiUrl(mediaJson?.media?.url);
			const thumbObject = this.extractObjectNameFromApiUrl(mediaJson?.media?.thumbnailUrl);

			try {
				if (mainObject) {
					const metadata = await getFileMetadata(mainObject);
					if (metadata?.size) totalFileSize += metadata.size;
					await deleteFile(mainObject);
				}
			} catch {
				/* ignore */
			}

			if (mediaJson?.media?.type === "image") {
				const thumbnailBase64 = mediaJson?.media?.thumbnailBase64;
				if (thumbnailBase64) {
					totalFileSize += thumbnailBase64.length;
				}
			} else {
				try {
					if (thumbObject) {
						const metadata = await getFileMetadata(thumbObject);
						if (metadata?.size) totalFileSize += metadata.size;
						await deleteFile(thumbObject);
					}
				} catch {
					/* ignore */
				}
			}
		} else if (content.type === "audio") {
			try {
				const audioJson = parseAudioJson(content.content);
				const audioObj = audioJson?.audio?.object || this.extractObjectNameFromApiUrl(audioJson?.audio?.url);
				const coverObj = audioJson?.cover?.object || this.extractObjectNameFromApiUrl(audioJson?.cover?.url);

				if (audioJson?.audio?.sizeBytes) {
					totalFileSize += audioJson.audio.sizeBytes;
				} else if (audioObj) {
					const metadata = await getFileMetadata(audioObj);
					if (metadata?.size) totalFileSize += metadata.size;
				}

				if (audioObj) await deleteFile(audioObj);

				if (coverObj) {
					const metadata = await getFileMetadata(coverObj);
					if (metadata?.size) totalFileSize += metadata.size;
					await deleteFile(coverObj);
				} else if (audioJson?.cover?.thumbnailBase64) {
					totalFileSize += audioJson.cover.thumbnailBase64.length;
				}
			} catch {
				// ignore
			}
		}

		if (totalFileSize > 0) removedFileSizes.push(totalFileSize);
		await this.trackRemovedNoteImages(removedFileSizes);

		await this.invalidateUserTags();
		return { success: true };
	}

	async getTags() {
		const cacheKey = `user:${this.ctx.user!.id}:tags`;
		const cached = await this.ctx.cache.getJSON<Array<{ id: string; title: string }>>(cacheKey);
		if (cached) return cached;

		const contentTags = await this.repo.getContentTags();
		const tagIds = Array.from(new Set((contentTags || []).map((r: any) => r.tag_id)));
		if (!tagIds.length) return [];

		const tags = await this.repo.getTags(tagIds);
		const result = (tags || []).map((t) => ({ id: t.id, title: t.title }));
		await this.ctx.cache.setJSON(cacheKey, result, TAGS_CACHE_TTL_SECONDS);
		return result;
	}

	async getTagById(id: string) {
		return await this.repo.getTagById(id);
	}

	async syncSearchText(content: Content) {
		await this.repo.updateSearchText(content.id, buildContentSearchText(content));
	}

	async getTagsWithContent() {
		const cacheKey = `user:${this.ctx.user!.id}:tags_with_content`;
		const cached =
			await this.ctx.cache.getJSON<Array<{ id: string; title: string; items: Content[] }>>(cacheKey);
		if (cached) return cached;

		const previewRows = await this.repo.getTagsWithContentPreview(3);
		if (!previewRows.length) return [];

		const uniqueRows = Array.from(new Map(previewRows.map((row) => [row.id, row as ContentRow])).values());
		const items = await this.attachTagsToContent(uniqueRows);
		const itemById = new Map(items.map((item) => [item.id, item]));
		const tagsMap = new Map<string, { id: string; title: string; items: Content[] }>();

		for (const row of previewRows) {
			const item = itemById.get(row.id);
			if (!item) continue;

			if (!tagsMap.has(row.tagId)) {
				tagsMap.set(row.tagId, { id: row.tagId, title: row.tagTitle, items: [] });
			}

			const bucket = tagsMap.get(row.tagId)!;
			if (bucket.items.length < 3) {
				bucket.items.push(item);
			}
		}

		const result = Array.from(tagsMap.values());
		await this.ctx.cache.setJSON(cacheKey, result, TAGS_CACHE_TTL_SECONDS);
		return result;
	}

	private extractObjectNameFromApiUrl(url?: string | null): string | null {
		if (!url) return null;
		try {
			const prefix = "/api/files/";
			if (url.startsWith(prefix)) return url.slice(prefix.length);
			const idx = url.indexOf("/api/files/");
			if (idx >= 0) return url.slice(idx + "/api/files/".length);
		} catch {
			// ignore
		}
		return null;
	}

	private async replaceContentTags(
		repo: ContentRepository,
		contentId: string,
		tagIds: string[],
		contentNodeId: string,
		tagNodeIdByTagId: Record<string, string>
	) {
		await repo.deleteContentTag(contentId);
		await repo.deleteTagEdge(contentNodeId);
		await this.upsertContentTags(repo, contentId, tagIds, contentNodeId, tagNodeIdByTagId);
	}

	private async invalidateUserTags() {
		const userId = this.ctx.user!.id;
		await Promise.all([
			this.ctx.cache.del(`user:${userId}:tags`),
			this.ctx.cache.del(`user:${userId}:tags_with_content`),
		]);
	}

	private async attachTagsToContent(rows: ContentRow[]): Promise<Content[]> {
		const items = rows.map((r) => this.mapContentRow(r, this.ctx.user!.id));
		if (!items.length) return items;

		const ids = rows.map((r) => r.id);
		const contentTagsWithTitles = await this.repo.contentTagsWithTitles(ids);
		const byContent = new Map<string, { ids: string[]; titles: string[] }>();

		for (const r of contentTagsWithTitles || []) {
			byContent.set(r.content_id, {
				ids: r.tag_ids || [],
				titles: r.tag_titles || [],
			});
		}

		return items.map((i) => {
			const tags = byContent.get(i.id);
			return {
				...i,
				tag_ids: tags?.ids || [],
				tags: tags?.titles || [],
			};
		});
	}

	private async resolveTagTitlesToIds(repo: ContentRepository, titles: string[]): Promise<string[]> {
		if (titles.length === 0) return [];
		const existing = await repo.getTagsByTitle(titles);
		const existingMap = new Map((existing || []).map((t) => [t.title, t.id]));
		const missing = titles.filter((t) => !existingMap.has(t));
		if (missing.length) {
			const inserted = await repo.createTags(missing.map((title) => ({ title })));
			for (const t of inserted || []) {
				await repo.createNode(t.title);
				existingMap.set(t.title, t.id);
			}
		}
		const ids = titles.map((t) => existingMap.get(t));
		return ids.filter((v): v is string => typeof v === "string" && v.length > 0);
	}

	private async upsertContentTags(
		repo: ContentRepository,
		contentId: string,
		tagIds: string[],
		contentNodeId: string,
		tagNodeIdByTagId: Record<string, string>
	) {
		if (!tagIds.length) return;
		await repo.createContentTags(tagIds, contentId);
		const edgeRows = tagIds
			.map((tagId) => ({
				from_node: contentNodeId,
				to_node: tagNodeIdByTagId[tagId],
				relation_type: "content_tag",
				user_id: this.ctx.user!.id,
			}))
			.filter((r) => !!r.to_node);
		if (edgeRows.length) await repo.createEdges(edgeRows);
	}

	private mapContentRow(row: ContentRow, fallbackUserId: string): Content {
		return {
			id: row.id,
			user_id: row.userId ?? fallbackUserId,
			type: row.type as Content["type"],
			title: row.title ?? undefined,
			content: row.content,
			tags: [],
			tag_ids: [],
			created_at: row.createdAt?.toISOString() ?? new Date().toISOString(),
			updated_at: row.updatedAt?.toISOString() ?? row.createdAt?.toISOString() ?? new Date().toISOString(),
			thumbnail_base64: row.thumbnailBase64 ?? undefined,
			document_images: Array.isArray(row.documentImages) ? row.documentImages : undefined,
		};
	}

	private async trackAddedNoteImages(images: { size: number }[]) {
		try {
			await Promise.all(images.map((image) => this.ctx.cache.addFile(this.ctx.user!.id, image.size)));
		} catch {}
	}

	private async trackRemovedNoteImages(sizes: number[]) {
		try {
			await Promise.all(sizes.map((size) => this.ctx.cache.removeFile(this.ctx.user!.id, size)));
		} catch {}
	}
}
