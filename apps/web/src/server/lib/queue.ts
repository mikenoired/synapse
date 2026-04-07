import type Redis from "ioredis";
import IORedis from "ioredis";

export const thumbnailQueueName = "thumbnail-generation";
const defaultThumbnailJobAttempts = 3;

export interface ThumbnailJobData {
	contentId: string;
	objectName: string;
	mimeType: string;
	type: "image" | "video" | "audio-cover";
	attempts?: number;
}

let redisConnection: Redis | null = null;

function getRedisConnection(): Redis {
	if (redisConnection) return redisConnection;

	redisConnection = new IORedis({
		host: process.env.REDIS_HOST || "localhost",
		port: Number.parseInt(process.env.REDIS_PORT || "6379", 10),
		password: process.env.REDIS_PASSWORD,
		maxRetriesPerRequest: null,
	});

	return redisConnection;
}

export async function enqueueThumbnailJob(job: ThumbnailJobData): Promise<void> {
	const payload: ThumbnailJobData = {
		...job,
		attempts: job.attempts ?? defaultThumbnailJobAttempts,
	};

	await getRedisConnection().rpush(thumbnailQueueName, JSON.stringify(payload));
}
