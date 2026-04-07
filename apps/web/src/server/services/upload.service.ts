import { Buffer } from "node:buffer";

import type { Context } from "../context";
import { processAudioUpload } from "./upload/audio-handler";
import { processImageUpload } from "./upload/image-handler";
import type { UploadHandlerDeps } from "./upload/upload-handler-types";
import { UploadTagService } from "./upload/upload-tag-service";
import type {
	AudioUploadParams,
	FilePayload,
	ProcessOutcome,
	UploadedFileInfo,
	UploadBaseParams,
	UploadOutcome,
	UploadRequest,
} from "./upload/upload-types";
import { processVideoUpload } from "./upload/video-handler";

export default class UploadService {
	private readonly tagService: UploadTagService;

	private readonly handlerDeps: UploadHandlerDeps;

	constructor(private readonly ctx: Context) {
		this.tagService = new UploadTagService(ctx);
		this.handlerDeps = {
			attachTags: this.tagService.attachTags.bind(this.tagService),
			ctx,
		};
	}

	async handleUpload(payload: UploadRequest): Promise<UploadOutcome> {
		const userId = this.requireUserId();

		const files = payload.files || [];
		const titleRaw = payload.title?.trim();
		const tags = this.normalizeTags(payload.tags);
		const makeTrack = Boolean(payload.makeTrack);

		const uploadResults: UploadedFileInfo[] = [];
		const errors: string[] = [];

		for (const file of files) {
			try {
				const payloadFile = this.createFilePayload(file);
				const outcome = await this.processFile(payloadFile, {
					makeTrack,
					tags,
					title: titleRaw,
					userId,
				});

				if (!outcome) {
					errors.push(`File "${file.name}" is not an image, video, or audio`);
					continue;
				}

				if (outcome?.errors?.length) errors.push(...outcome.errors);

				if (outcome?.result) uploadResults.push(outcome.result);
			} catch (error) {
				errors.push(
					`Failed to upload "${file.name}": ${error instanceof Error ? error.message : "Unknown error"}`
				);
			}
		}

		return {
			files: uploadResults,
			errors,
		};
	}

	private normalizeTags(tags?: string[] | null): string[] {
		if (!Array.isArray(tags)) return [];
		return tags.map((t) => t.trim()).filter(Boolean);
	}

	private createFilePayload(file: UploadRequest["files"][number]): FilePayload {
		return {
			buffer: Buffer.from(file.content, "base64"),
			name: file.name,
			size: file.size,
			type: file.type,
		};
	}

	private createHandlerDeps(): UploadHandlerDeps {
		return this.handlerDeps;
	}

	private async processFile(
		file: FilePayload,
		params: UploadBaseParams & { makeTrack: boolean }
	): Promise<ProcessOutcome | undefined> {
		const deps = this.createHandlerDeps();

		if (file.type.startsWith("image/")) return processImageUpload(deps, file, params);
		if (file.type.startsWith("video/")) return processVideoUpload(deps, file, params);
		if (file.type.startsWith("audio/")) {
			const audioParams: AudioUploadParams = {
				makeTrack: params.makeTrack,
				tags: params.tags,
				title: params.title,
				userId: params.userId,
			};

			return processAudioUpload(deps, file, audioParams);
		}

		return undefined;
	}

	private requireUserId(): string {
		if (!this.ctx.user?.id) throw new Error("Unauthorized");
		return this.ctx.user.id;
	}
}
