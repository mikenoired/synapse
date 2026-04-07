import type { Context } from "../../context";

export interface UploadTagAttacher {
	(contentId: string, tags: string[], type: "media" | "audio", title?: string): Promise<void>;
}

export interface UploadHandlerDeps {
	attachTags: UploadTagAttacher;
	ctx: Context;
}
