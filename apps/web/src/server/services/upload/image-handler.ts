import { getPublicUrl, uploadFile } from "@/shared/api/minio";

import { generateThumbnail, getImageDimensions } from "../../lib/generate-thumbnail";
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

	const [imageDimensions, thumbnailBase64] = await Promise.all([
		getImageDimensionsSafe(getImageDimensions, file.buffer),
		generateThumbnail(file.buffer),
	]);
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
	const serializedContent = JSON.stringify(
		buildImageMediaContent({ imageDimensions, objectName, publicUrl, thumbnailBase64 })
	);

	const createdContent = await deps.persistContent({
		content: serializedContent,
		tags: params.tags,
		title: params.title || undefined,
		type: "media",
		userId: params.userId,
	});

	await deps.trackStorage(params.userId, [{ size: uploadResult.fileSize || 0 }]);

	return {
		errors,
		result: {
			content: createdContent,
			fileName: file.name,
			objectName,
			size: file.size,
			thumbnailBase64,
			type: file.type,
			url: publicUrl,
		},
	};
}
