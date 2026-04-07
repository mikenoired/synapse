import { getPublicUrl, uploadFile } from "@/shared/api/minio";

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
	const serializedContent = JSON.stringify(
		buildImageMediaContent({ imageDimensions, objectName, publicUrl })
	);

	const createdContent = await deps.persistContent({
		content: serializedContent,
		tags: params.tags,
		title: params.title || undefined,
		type: "media",
		userId: params.userId,
	});

	await deps.trackStorage(params.userId, [{ size: uploadResult.fileSize || 0 }]);

	await enqueueThumbnailJob({
		contentId: createdContent.id,
		mimeType: file.type,
		objectName,
		type: "image",
	});

	return {
		errors,
		result: {
			content: createdContent,
			fileName: file.name,
			objectName,
			size: file.size,
			type: file.type,
			url: publicUrl,
		},
	};
}
