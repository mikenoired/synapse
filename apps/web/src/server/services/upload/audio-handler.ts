import sharp from "sharp";

import { getPublicUrl, uploadFile } from "@/shared/api/minio";

import { getImageDimensions } from "../../lib/generate-thumbnail";
import { enqueueThumbnailJob } from "../../lib/queue";
import type { UploadHandlerDeps } from "./upload-handler-types";
import {
	audioUploadMaxFileSizeBytes,
	buildAudioContent,
	getImageDimensionsSafe,
	jpegMimeType,
	parseAudioMetadataSafe,
} from "./upload-media";
import type { AudioUploadParams, FilePayload, ProcessOutcome } from "./upload-types";

export async function processAudioUpload(
	deps: UploadHandlerDeps,
	file: FilePayload,
	params: AudioUploadParams
): Promise<ProcessOutcome> {
	if (file.size > audioUploadMaxFileSizeBytes)
		return { errors: [`File "${file.name}" is too large (max 50MB)`] };

	const metadata = await parseAudioMetadataSafe(file.buffer, file.type);
	const audioUpload = await uploadFile(file.buffer, file.name, file.type, params.userId, "audio", {
		maxFileSize: audioUploadMaxFileSizeBytes,
	});
	const errors: string[] = [];

	if (!audioUpload.validation.isValid)
		errors.push(`File "${file.name}" is not valid: ${audioUpload.validation.errors.join(", ")}`);

	if (!audioUpload.success || !audioUpload.objectName) {
		errors.push(`Failed to upload file "${file.name}"`);
		return { errors };
	}

	const audioUrl = getPublicUrl(audioUpload.objectName);
	let coverUrl: string | undefined;
	let coverObject: string | undefined;
	let coverDims: { height: number; width: number } | undefined;
	let coverFileSize: number | undefined;

	const picture = metadata?.common.picture?.[0];
	if (picture?.data?.length) {
		try {
			const jpeg = await sharp(picture.data).jpeg({ quality: 85 }).toBuffer();
			const coverUpload = await uploadFile(
				jpeg,
				file.name.replace(/\.[^.]+$/, ".jpg"),
				jpegMimeType,
				params.userId,
				"audio-covers"
			);

			if (!coverUpload.validation.isValid)
				errors.push(`Cover for "${file.name}" is not valid: ${coverUpload.validation.errors.join(", ")}`);

			if (coverUpload.success && coverUpload.objectName) {
				coverObject = coverUpload.objectName;
				coverUrl = getPublicUrl(coverUpload.objectName);
				coverFileSize = coverUpload.fileSize || 0;
				coverDims = await getImageDimensionsSafe(getImageDimensions, jpeg);
			}
		} catch {}
	}

	const entityTitle = params.title || metadata?.common.title || undefined;
	const serializedContent = JSON.stringify(
		buildAudioContent({
			audioObjectName: audioUpload.objectName,
			audioUrl,
			bufferLength: file.buffer.length,
			coverDims,
			coverObject,
			coverUrl,
			fileType: file.type,
			makeTrack: params.makeTrack,
			metadata,
			title: params.title,
		})
	);
	const createdContent = await deps.persistContent({
		content: serializedContent,
		tags: params.tags,
		title: entityTitle,
		type: "audio",
		userId: params.userId,
	});

	await deps.trackStorage(params.userId, [
		{ size: audioUpload.fileSize || 0 },
		{ size: coverFileSize || 0, updateFileCount: false },
	]);

	if (coverObject) {
		await enqueueThumbnailJob({
			contentId: createdContent.id,
			mimeType: jpegMimeType,
			objectName: coverObject,
			type: "audio-cover",
		});
	}

	return {
		errors,
		result: {
			content: createdContent,
			cover: coverUrl,
			fileName: file.name,
			objectName: audioUpload.objectName,
			size: file.size,
			type: file.type,
			url: audioUrl,
		},
	};
}
