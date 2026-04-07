import { getPublicUrl, uploadFile } from "@/shared/api/minio";

import { content } from "../../db/schema";
import { getImageDimensions } from "../../lib/generate-thumbnail";
import { enqueueThumbnailJob } from "../../lib/queue";
import type { UploadHandlerDeps } from "./upload-handler-types";
import { buildImageMediaContent, getImageDimensionsSafe, imageUploadMaxFileSizeBytes } from "./upload-media";
import type { FilePayload, ProcessOutcome, UploadBaseParams } from "./upload-types";

export async function processImageUpload(
	deps: UploadHandlerDeps,
	file: FilePayload,
	params: UploadBaseParams
): Promise<ProcessOutcome> {
	if (file.size > imageUploadMaxFileSizeBytes)
		return { errors: [`File "${file.name}" is too large (max 10MB)`] };

	const uploadResult = await uploadFile(file.buffer, file.name, file.type, params.userId);
	const errors: string[] = [];

	if (!uploadResult.validation.isValid)
		errors.push(`File "${file.name}" is not valid: ${uploadResult.validation.errors.join(", ")}`);

	if (!uploadResult.success || !uploadResult.objectName) {
		errors.push(`Failed to upload file "${file.name}"`);
		return { errors };
	}

	const objectName = uploadResult.objectName;
	const publicUrl = getPublicUrl(objectName);
	const imageDimensions = await getImageDimensionsSafe(getImageDimensions, file.buffer);

	await deps.ctx.cache.addFile(params.userId, uploadResult.fileSize || 0);

	const [inserted] = await deps.ctx.db
		.insert(content)
		.values({
			content: JSON.stringify(buildImageMediaContent({ imageDimensions, objectName, publicUrl })),
			title: params.title || undefined,
			type: "media",
			userId: params.userId,
		})
		.returning({ id: content.id });

	if (inserted?.id) {
		await deps.attachTags(inserted.id, params.tags, "media", params.title || undefined);

		await enqueueThumbnailJob({
			contentId: inserted.id,
			mimeType: file.type,
			objectName,
			type: "image",
		});
	}

	return {
		errors,
		result: {
			fileName: file.name,
			objectName,
			size: file.size,
			type: file.type,
			url: publicUrl,
		},
	};
}
