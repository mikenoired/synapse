import Redis from "ioredis";
import { Client as Minio } from "minio";
import postgres from "postgres";

import { config } from "./config";
import { imageThumbnail, videoThumbnail } from "./media";

interface Job {
	contentId: string;
	objectName: string;
	mimeType: string;
	type: "image" | "video" | "audio-cover";
	attempts?: number;
}

const queue = "thumbnail-generation";
const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
const minio = new Minio(config.minio);
const sql = postgres(config.postgresUrl);
let running = true;

function parseJob(value: string): Job {
	const job = JSON.parse(value) as Partial<Job>;
	if (
		!job.contentId ||
		!job.objectName ||
		!job.mimeType ||
		!["image", "video", "audio-cover"].includes(job.type ?? "")
	)
		throw new Error("invalid thumbnail job");
	return job as Job;
}

async function objectBytes(name: string) {
	const stream = await minio.getObject(config.minioBucket, name);
	const chunks: Buffer[] = [];
	for await (const chunk of stream) chunks.push(Buffer.from(chunk));
	return Buffer.concat(chunks);
}

async function processJob(job: Job) {
	const data = await objectBytes(job.objectName);
	const thumbnail =
		job.type === "video"
			? await videoThumbnail(data, "00:00:01.000", config.width, config.height, config.quality)
			: await imageThumbnail(data, config.width, config.height, config.quality);
	const [record] = await sql<
		{ content: string }[]
	>`SELECT content::text AS content FROM content WHERE id = ${job.contentId}`;
	if (!record) throw new Error(`content ${job.contentId} not found`);

	const content = JSON.parse(record.content) as {
		media?: { thumbnailBase64?: string };
		cover?: { thumbnailBase64?: string };
	};
	const target = job.type === "audio-cover" ? content.cover : content.media;
	if (!target)
		throw new Error(
			job.type === "audio-cover" ? "audio cover payload is missing" : "media payload is missing"
		);
	target.thumbnailBase64 = thumbnail.thumbnailBase64;
	await sql`UPDATE content SET content = ${JSON.stringify(content)}, updated_at = NOW() WHERE id = ${job.contentId}`;
}

async function worker() {
	while (running) {
		let result: [string, string] | null;
		try {
			result = await redis.blpop(queue, 5);
		} catch (error) {
			if (!running) return;
			throw error;
		}
		if (!result) continue;
		let job: Job | undefined;
		try {
			job = parseJob(result[1]);
			await processJob(job);
		} catch (error) {
			process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
			if (job && (job.attempts ?? 0) > 1)
				await redis.rpush(queue, JSON.stringify({ ...job, attempts: job.attempts! - 1 }));
		}
	}
}

process.stdout.write(`Starting ${config.maxConcurrentJobs} thumbnail workers\n`);
await Promise.all([
	...Array.from({ length: config.maxConcurrentJobs }, worker),
	new Promise<void>((resolve) => {
		for (const signal of ["SIGINT", "SIGTERM"] as const)
			process.once(signal, () => {
				running = false;
				redis.disconnect();
				void sql.end().then(resolve);
			});
	}),
]);
