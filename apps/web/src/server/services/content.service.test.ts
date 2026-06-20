import { afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";

import { and, eq, inArray, sql } from "drizzle-orm";

import type { Context } from "../context";
import { db } from "../db";
import { content, contentTags, edges, nodes, tags, users } from "../db/schema";
import type ContentServiceType from "./content.service";

const testEmail = "bun-content-test@synapse.local";
const foreignEmail = "bun-content-foreign@synapse.local";
let userId = "";
let ContentService: typeof ContentServiceType;

const cache = {
	del: async () => 1,
	getJSON: async () => null,
	setJSON: async () => "OK",
};

const createService = () =>
	new ContentService({
		cache,
		db,
		user: { id: userId, email: testEmail },
	} as unknown as Context);

const deleteTestUser = async () => {
	await db.delete(users).where(inArray(users.email, [testEmail, foreignEmail]));
};

beforeAll(async () => {
	process.env.MINIO_ENDPOINT ||= "localhost";
	process.env.MINIO_ACCESS_KEY ||= "test";
	process.env.MINIO_SECRET_KEY ||= "test";
	ContentService = (await import("./content.service")).default;
});

beforeEach(async () => {
	await deleteTestUser();
	const [user] = await db
		.insert(users)
		.values({ email: testEmail, passwordHash: "not-used-by-content-tests" })
		.returning({ id: users.id });
	userId = user!.id;
});

afterEach(async () => {
	await deleteTestUser();

	const leftovers = await Promise.all([
		db.select().from(content).where(eq(content.userId, userId)),
		db.select().from(tags).where(eq(tags.userId, userId)),
		db.select().from(contentTags).where(eq(contentTags.userId, userId)),
		db.select().from(nodes).where(eq(nodes.userId, userId)),
		db.select().from(edges).where(eq(edges.userId, userId)),
	]);
	expect(leftovers.every((rows) => rows.length === 0)).toBe(true);
});

describe.serial("content service", () => {
	test("creates content quickly and persists its tag and graph relations", async () => {
		const [tag] = await db.insert(tags).values({ title: "integration", userId }).returning();
		const startedAt = performance.now();
		const created = await createService().create({
			type: "note",
			media_type: "image",
			title: "Bun integration note",
			content: "Persisted body",
			tag_ids: [tag!.id],
		});
		const saveDurationMs = performance.now() - startedAt;

		expect(saveDurationMs).toBeLessThan(1_000);
		expect(created).toMatchObject({
			user_id: userId,
			type: "note",
			title: "Bun integration note",
			content: "Persisted body",
			tag_ids: [tag!.id],
			tags: ["integration"],
		});

		const service = createService();
		expect(await service.getById(created.id)).toEqual(created);
		const result = await service.getAll("integration note", "note", [tag!.id], undefined, 10, true);
		expect(result.items).toEqual([created]);

		const contentNode = await db.query.nodes.findFirst({
			where: and(eq(nodes.userId, userId), sql`${nodes.metadata}->>'content_id' = ${created.id}`),
		});
		const tagNode = await db.query.nodes.findFirst({
			where: and(eq(nodes.userId, userId), sql`${nodes.metadata}->>'tag_id' = ${tag!.id}`),
		});
		expect(contentNode).toBeDefined();
		expect(tagNode).toBeDefined();
		expect(
			await db.query.edges.findFirst({
				where: and(
					eq(edges.userId, userId),
					eq(edges.fromNode, contentNode!.id),
					eq(edges.toNode, tagNode!.id),
					eq(edges.relationType, "content_tag")
				),
			})
		).toBeDefined();
	});

	test("updates content relations and removes all content-owned data on delete", async () => {
		const [firstTag, secondTag] = await db
			.insert(tags)
			.values([
				{ title: "before", userId },
				{ title: "after", userId },
			])
			.returning();
		const service = createService();
		const created = await service.create({
			type: "todo",
			media_type: "image",
			title: "Before",
			content: "unchecked",
			tag_ids: [firstTag!.id],
		});

		const updated = await service.update({
			id: created.id,
			title: "After",
			content: "checked",
			tag_ids: [secondTag!.id],
		});
		expect(updated).toMatchObject({
			title: "After",
			content: "checked",
			tag_ids: [secondTag!.id],
			tags: ["after"],
		});
		expect((await service.getTagsWithContent()).find((tag) => tag.id === secondTag!.id)?.items).toEqual([
			updated,
		]);

		expect(await service.delete(created.id)).toEqual({ success: true });
		expect(await db.select().from(content).where(eq(content.id, created.id))).toHaveLength(0);
		expect(await db.select().from(contentTags).where(eq(contentTags.contentId, created.id))).toHaveLength(0);
		expect(
			await db
				.select()
				.from(nodes)
				.where(sql`${nodes.metadata}->>'content_id' = ${created.id}`)
		).toHaveLength(0);
		expect(
			await db
				.select()
				.from(edges)
				.where(and(eq(edges.userId, userId), eq(edges.relationType, "content_tag")))
		).toHaveLength(0);
	});

	test("rejects relations to another user's tag without leaving partial content", async () => {
		const [foreignUser] = await db
			.insert(users)
			.values({ email: foreignEmail, passwordHash: "not-used-by-content-tests" })
			.returning();
		const [foreignTag] = await db
			.insert(tags)
			.values({ title: "private", userId: foreignUser!.id })
			.returning();

		await expect(
			createService().create({
				type: "note",
				media_type: "image",
				content: "must roll back",
				tag_ids: [foreignTag!.id],
			})
		).rejects.toMatchObject({ code: "NOT_FOUND", message: "Tag not found" });
		expect(await db.select().from(content).where(eq(content.userId, userId))).toHaveLength(0);
	});
});
