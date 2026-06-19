import sharp from "sharp";

export interface Thumbnail {
	thumbnailBase64: string;
	mimeType: "image/jpeg";
	width: number;
	height: number;
	sizeBytes: number;
}

export async function imageDimensions(data: Uint8Array) {
	const { width, height } = await sharp(data, { animated: false }).metadata();
	if (!width || !height) throw new Error("image dimensions are unavailable");
	return { width, height, sizeBytes: data.byteLength };
}

export async function imageThumbnail(
	data: Uint8Array,
	width: number,
	height: number,
	quality: number
): Promise<Thumbnail> {
	const output = await sharp(data, { animated: false })
		.resize({
			width: width || undefined,
			height: height || undefined,
			fit: "inside",
			withoutEnlargement: true,
		})
		.jpeg({ quality })
		.toBuffer({ resolveWithObject: true });

	return {
		thumbnailBase64: output.data.toString("base64"),
		mimeType: "image/jpeg",
		width: output.info.width,
		height: output.info.height,
		sizeBytes: output.data.byteLength,
	};
}

export async function videoThumbnail(
	data: Uint8Array,
	timestamp: string,
	width: number,
	height: number,
	quality: number
) {
	const process = Bun.spawn(
		[
			"ffmpeg",
			"-loglevel",
			"error",
			"-i",
			"pipe:0",
			"-ss",
			timestamp,
			"-frames:v",
			"1",
			"-f",
			"image2pipe",
			"-vcodec",
			"png",
			"pipe:1",
		],
		{ stdin: data, stdout: "pipe", stderr: "pipe" }
	);
	const [frame, error, exitCode] = await Promise.all([
		new Response(process.stdout).arrayBuffer(),
		new Response(process.stderr).text(),
		process.exited,
	]);
	if (exitCode !== 0) throw new Error(`ffmpeg failed: ${error.trim()}`);
	return imageThumbnail(new Uint8Array(frame), width, height, quality);
}
