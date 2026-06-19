import { join } from "node:path";

import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";

import { config } from "./config";
import { imageDimensions, imageThumbnail, videoThumbnail } from "./media";

interface ImageRequest {
	image_data: Buffer;
	width: number;
	height: number;
	quality: number;
}

interface VideoRequest {
	video_data: Buffer;
	timestamp: string;
	width: number;
	height: number;
	quality: number;
}

type Callback = grpc.sendUnaryData<Record<string, unknown>>;

const defaults = (request: { width: number; height: number; quality: number }) => ({
	width: request.width > 0 ? request.width : config.width,
	height: request.height > 0 ? request.height : config.height,
	quality: request.quality > 0 && request.quality <= 100 ? request.quality : config.quality,
});

const failure = (callback: Callback, error: unknown) => {
	process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
	callback(null, { success: false, error_message: error instanceof Error ? error.message : String(error) });
};

const service = {
	async GenerateImageThumbnail(
		call: grpc.ServerUnaryCall<ImageRequest, Record<string, unknown>>,
		callback: Callback
	) {
		const request = call.request;
		if (!request.image_data?.byteLength)
			return callback(null, { success: false, error_message: "image data is required" });
		if (request.image_data.byteLength > config.maxImageSize)
			return callback(null, {
				success: false,
				error_message: `image size exceeds maximum allowed size of ${config.maxImageSize} bytes`,
			});

		try {
			const { width, height, quality } = defaults(request);
			const result = await imageThumbnail(request.image_data, width, height, quality);
			callback(null, {
				success: true,
				thumbnail_base64: result.thumbnailBase64,
				mime_type: result.mimeType,
				width: result.width,
				height: result.height,
				size_bytes: result.sizeBytes,
			});
		} catch (error) {
			failure(callback, error);
		}
	},

	async GenerateVideoThumbnail(
		call: grpc.ServerUnaryCall<VideoRequest, Record<string, unknown>>,
		callback: Callback
	) {
		const request = call.request;
		if (!request.video_data?.byteLength)
			return callback(null, { success: false, error_message: "video data is required" });
		if (request.video_data.byteLength > config.maxVideoSize)
			return callback(null, {
				success: false,
				error_message: `video size exceeds maximum allowed size of ${config.maxVideoSize} bytes`,
			});

		try {
			const { width, height, quality } = defaults(request);
			const result = await videoThumbnail(
				request.video_data,
				request.timestamp || "00:00:01.000",
				width,
				height,
				quality
			);
			callback(null, {
				success: true,
				thumbnail_base64: result.thumbnailBase64,
				mime_type: result.mimeType,
				width: result.width,
				height: result.height,
				size_bytes: result.sizeBytes,
			});
		} catch (error) {
			failure(callback, error);
		}
	},

	async GetImageDimensions(
		call: grpc.ServerUnaryCall<ImageRequest, Record<string, unknown>>,
		callback: Callback
	) {
		if (!call.request.image_data?.byteLength)
			return callback(null, { success: false, error_message: "image data is required" });
		try {
			const result = await imageDimensions(call.request.image_data);
			callback(null, {
				success: true,
				width: result.width,
				height: result.height,
				size_bytes: result.sizeBytes,
			});
		} catch (error) {
			failure(callback, error);
		}
	},
};

const definition = protoLoader.loadSync(join(import.meta.dir, "../proto/thumbnail.proto"), {
	keepCase: true,
	longs: String,
	defaults: true,
	oneofs: true,
});
const proto = grpc.loadPackageDefinition(definition) as unknown as {
	thumbnail: { ThumbnailService: { service: grpc.ServiceDefinition } };
};
const server = new grpc.Server({
	"grpc.max_receive_message_length": 100 * 1024 * 1024,
	"grpc.max_send_message_length": 100 * 1024 * 1024,
});
server.addService(proto.thumbnail.ThumbnailService.service, service);
server.bindAsync(`0.0.0.0:${config.grpcPort}`, grpc.ServerCredentials.createInsecure(), (error) => {
	if (error) throw error;
	process.stdout.write(`Thumbnail service listening on :${config.grpcPort}\n`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const)
	process.once(signal, () => server.tryShutdown(() => process.exit()));
