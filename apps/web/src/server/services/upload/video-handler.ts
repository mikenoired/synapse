import { randomUUID } from "node:crypto";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { getPublicUrl, uploadFile } from "@/shared/api/minio";

import { content } from "../../db/schema";
import { getImageDimensions } from "../../lib/generate-thumbnail";
import { enqueueThumbnailJob } from "../../lib/queue";
import type { UploadHandlerDeps } from "./upload-handler-types";
import {
	buildVideoMediaContent,
	compressVideo,
	extractVideoThumbnail,
	getImageDimensionsSafe,
	jpegMimeType,
	videoOutputMimeType,
} from "./upload-media";
import type { FilePayload, ProcessOutcome, UploadBaseParams } from "./upload-types";

export async function processVideoUpload(
	deps: UploadHandlerDeps,
	file: FilePayload,
	params: UploadBaseParams
): Promise<ProcessOutcome> {
	const tempVideoPath = join(tmpdir(), `${randomUUID()}-${file.name}`);
	const tempThumbPath = join(tmpdir(), `${randomUUID()}.jpg`);
	const compressedPath = join(tmpdir(), `${randomUUID()}-compressed.mp4`);
	const errors: string[] = [];

	try {
		await writeFile(tempVideoPath, file.buffer);
		await compressVideo(tempVideoPath, compressedPath);
		await extractVideoThumbnail(tempVideoPath, tempThumbPath);

		const compressedBuffer = await readFile(compressedPath);
		const thumbBuffer = await readFile(tempThumbPath);

		const videoUpload = await uploadFile(
			compressedBuffer,
			file.name.replace(/\.[^.]+$/, ".mp4"),
			videoOutputMimeType,
			params.userId,
			"media"
		);
		const thumbUpload = await uploadFile(
			thumbBuffer,
			file.name.replace(/\.[^.]+$/, ".jpg"),
			jpegMimeType,
			params.userId,
			"media-thumbs"
		);

		if (!videoUpload.validation.isValid)
			errors.push(`File "${file.name}" is not valid: ${videoUpload.validation.errors.join(", ")}`);
		if (!thumbUpload.validation.isValid)
			errors.push(`Thumbnail for "${file.name}" is not valid: ${thumbUpload.validation.errors.join(", ")}`);

		if (!videoUpload.success || !videoUpload.objectName || !thumbUpload.success || !thumbUpload.objectName) {
			errors.push(`Failed to upload video or thumbnail for "${file.name}"`);
			return { errors };
		}

		const videoDimensions = await getImageDimensionsSafe(getImageDimensions, thumbBuffer);

		await Promise.all([
			deps.ctx.cache.addFile(params.userId, videoUpload.fileSize || 0),
			deps.ctx.cache.addFile(params.userId, thumbUpload.fileSize || 0, false),
		]);

		const videoUrl = getPublicUrl(videoUpload.objectName);
		const thumbnailUrl = getPublicUrl(thumbUpload.objectName);
		const [inserted] = await deps.ctx.db
			.insert(content)
			.values({
				content: JSON.stringify(
					buildVideoMediaContent({
						objectName: videoUpload.objectName,
						publicUrl: videoUrl,
						thumbnailUrl,
						videoDimensions,
					})
				),
				title: params.title || undefined,
				type: "media",
				userId: params.userId,
			})
			.returning({ id: content.id });

		if (inserted?.id) {
			await deps.attachTags(inserted.id, params.tags, "media", params.title || undefined);

			await enqueueThumbnailJob({
				contentId: inserted.id,
				mimeType: videoOutputMimeType,
				objectName: videoUpload.objectName,
				type: "video",
			});
		}

		return {
			errors,
			result: {
				fileName: file.name,
				objectName: videoUpload.objectName,
				size: file.size,
				thumbnail: thumbnailUrl,
				type: file.type,
				url: videoUrl,
			},
		};
	} finally {
		await Promise.allSettled([unlink(tempVideoPath), unlink(compressedPath), unlink(tempThumbPath)]);
	}
}
