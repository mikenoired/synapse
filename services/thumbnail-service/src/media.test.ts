import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { imageDimensions, imageThumbnail, videoThumbnail } from "./media";

const asset = (name: string) => Bun.file(join(import.meta.dir, "../../../test/assets", name)).bytes();

describe("media thumbnails", () => {
	test("reads dimensions and creates a JPEG thumbnail", async () => {
		const image = await asset("test-image.png");
		const dimensions = await imageDimensions(image);
		const thumbnail = await imageThumbnail(image, 20, 0, 40);

		expect(dimensions.width).toBeGreaterThan(0);
		expect(thumbnail.mimeType).toBe("image/jpeg");
		expect(thumbnail.width).toBeLessThanOrEqual(20);
		expect(thumbnail.sizeBytes).toBeGreaterThan(0);
	});

	test("extracts a video frame without temporary files", async () => {
		const thumbnail = await videoThumbnail(await asset("test-video.mp4"), "00:00:01.000", 20, 0, 40);

		expect(thumbnail.width).toBeLessThanOrEqual(20);
		expect(thumbnail.sizeBytes).toBeGreaterThan(0);
	}, 15_000);
});
